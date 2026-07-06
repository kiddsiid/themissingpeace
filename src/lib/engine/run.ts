import { facts, deriveRisks, type Snapshot } from '@/lib/engine/rules';
import { interpret, type EngineOutput } from '@/lib/engine/peacekeeper';
import { supabaseAdmin } from '@/lib/supabase/admin';

const RISK_TYPES = new Set([
  'budget',
  'guest_count',
  'timeline',
  'vendor_booking',
  'document',
  'decision_bottleneck',
  'dream_mismatch',
  'planner_workload',
  'family_pressure',
  'weather',
  'destination_travel',
]);

async function workspaceContext(workspaceId: string): Promise<{ snapshot: Snapshot; context: Record<string, unknown> }> {
  const db = supabaseAdmin();
  const [profileResult, compassResult, budgetItemsResult, categoriesResult, vendorsResult, tasksResult, decisionsResult, boardsResult, documentsResult] = await Promise.all([
    db.from('wedding_profiles').select('wedding_date, guest_estimate, budget_total, planning_stage, honeymoon_enabled').eq('workspace_id', workspaceId).maybeSingle(),
    db.from('wedding_compass').select('summary, priorities_json, non_negotiables_json, avoid_json, cultural_values_json, traditions_json, tone').eq('workspace_id', workspaceId).maybeSingle(),
    db.from('budget_items').select('id, category_id, title, estimated_cost, committed_cost, paid_amount').eq('workspace_id', workspaceId),
    db.from('budget_categories').select('id, name, planned_amount').eq('workspace_id', workspaceId),
    db.from('vendors').select('id, name, category, status').eq('workspace_id', workspaceId),
    db.from('tasks').select('id, title, category, status, due_date, priority').eq('workspace_id', workspaceId),
    db.from('decisions').select('id, title, category, status, due_date').eq('workspace_id', workspaceId),
    db.from('board_items').select('id, title, type, disposition, source_url').eq('workspace_id', workspaceId).limit(25),
    db.from('documents').select('id, folder, title').eq('workspace_id', workspaceId),
  ]);

  for (const result of [profileResult, compassResult, budgetItemsResult, categoriesResult, vendorsResult, tasksResult, decisionsResult, boardsResult, documentsResult]) {
    if (result.error) throw result.error;
  }

  const categories = categoriesResult.data ?? [];
  const categoryById = new Map(categories.map((category) => [category.id, category.name]));
  const budgetItems = (budgetItemsResult.data ?? []).map((item) => ({
    ...item,
    categoryName: item.category_id ? categoryById.get(item.category_id) : undefined,
  }));
  const decisions = decisionsResult.data ?? [];
  const profile = profileResult.data;
  const snapshot: Snapshot = {
    today: new Date().toISOString().slice(0, 10),
    weddingDate: profile?.wedding_date ?? null,
    guestEstimate: profile?.guest_estimate ?? null,
    budgetTotal: profile?.budget_total ?? null,
    budgetItems: budgetItems.map((item) => ({
      categoryName: item.categoryName,
      estimatedCost: item.estimated_cost == null ? null : Number(item.estimated_cost),
      committedCost: item.committed_cost == null ? null : Number(item.committed_cost),
    })),
    vendors: (vendorsResult.data ?? []).map((vendor) => ({ category: vendor.category, status: vendor.status })),
    tasks: (tasksResult.data ?? []).map((task) => ({ status: task.status, dueDate: task.due_date })),
    decisionsOpen: decisions.filter((decision) => !['approved', 'rejected', 'deferred'].includes(decision.status)).length,
  };

  return {
    snapshot,
    context: {
      weddingProfile: profile,
      weddingCompass: compassResult.data,
      deterministicFacts: facts(snapshot),
      deterministicRisks: deriveRisks(snapshot),
      budgetCategories: categories,
      budgetItems,
      vendors: vendorsResult.data ?? [],
      tasks: tasksResult.data ?? [],
      decisions,
      boardItems: boardsResult.data ?? [],
      documents: documentsResult.data ?? [],
      boundaries: {
        peaceNotesExcluded: true,
        engineDoesNotActAutonomously: true,
      },
    },
  };
}

function riskType(type: string) {
  return RISK_TYPES.has(type) ? type : 'dream_mismatch';
}

function recommendationRows(workspaceId: string, engineRunId: string, output: EngineOutput) {
  return [
    ...output.nextActions.map((item) => ({
      workspace_id: workspaceId,
      engine_run_id: engineRunId,
      title: item.title,
      description: item.reason ?? null,
      recommendation_type: 'next_action',
      priority: 'med',
      reason: item.reason ?? null,
    })),
    ...output.openDecisions.map((title) => ({
      workspace_id: workspaceId,
      engine_run_id: engineRunId,
      title,
      recommendation_type: 'decision_prompt',
      priority: 'med',
    })),
    ...output.budgetGuidance.map((title) => ({
      workspace_id: workspaceId,
      engine_run_id: engineRunId,
      title,
      recommendation_type: 'budget_guidance',
      priority: 'med',
    })),
    ...output.vendorGaps.map((title) => ({
      workspace_id: workspaceId,
      engine_run_id: engineRunId,
      title,
      recommendation_type: 'vendor_gap',
      priority: 'med',
    })),
    ...output.guestImpact.map((title) => ({
      workspace_id: workspaceId,
      engine_run_id: engineRunId,
      title,
      recommendation_type: 'guest_impact',
      priority: 'med',
    })),
    ...output.dreamAlignment.map((title) => ({
      workspace_id: workspaceId,
      engine_run_id: engineRunId,
      title,
      recommendation_type: 'compass_check',
      priority: 'med',
    })),
    ...output.poofSuggestions.map((item) => ({
      workspace_id: workspaceId,
      engine_run_id: engineRunId,
      title: item.why,
      description: item.why,
      recommendation_type: 'poof_suggestion',
      priority: 'med',
      linked_entity_type: item.boardItemId ? 'board_item' : null,
      linked_entity_id: item.boardItemId ?? null,
      reason: `Suggested target: ${item.target}`,
    })),
  ];
}

export async function runPeaceEngine(args: { workspaceId: string; actorUserId?: string; triggerType?: 'manual' | 'onboarding' | 'change_event' | 'scheduled' }) {
  const db = supabaseAdmin();
  const { data: run, error: runError } = await db
    .from('planning_engine_runs')
    .insert({
      workspace_id: args.workspaceId,
      trigger_type: args.triggerType ?? 'manual',
      status: 'running',
      created_by: args.actorUserId ?? null,
    })
    .select('id')
    .single();
  if (runError) throw runError;

  try {
    const { snapshot, context } = await workspaceContext(args.workspaceId);
    const output = await interpret(context);
    const deterministicRisks = deriveRisks(snapshot);

    const recommendations = recommendationRows(args.workspaceId, run.id, output);
    const risks = [
      ...deterministicRisks.map((risk) => ({
        workspace_id: args.workspaceId,
        engine_run_id: run.id,
        risk_type: risk.type,
        severity: risk.severity,
        title: risk.title,
      })),
      ...output.risks.map((risk) => ({
        workspace_id: args.workspaceId,
        engine_run_id: run.id,
        risk_type: riskType(risk.type),
        severity: risk.severity ?? 'med',
        title: risk.title,
      })),
    ];

    await Promise.all([
      recommendations.length ? db.from('planning_recommendations').insert(recommendations) : Promise.resolve({ error: null }),
      risks.length ? db.from('planning_risks').insert(risks) : Promise.resolve({ error: null }),
      db.from('planning_engine_runs').update({ status: 'completed', completed_at: new Date().toISOString(), summary: output.planningSummary }).eq('id', run.id),
    ]);

    return { runId: run.id as string, output };
  } catch (error) {
    await db
      .from('planning_engine_runs')
      .update({ status: 'failed', completed_at: new Date().toISOString(), summary: error instanceof Error ? error.message : 'Peace Engine failed' })
      .eq('id', run.id);
    throw error;
  }
}
