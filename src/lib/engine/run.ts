import { facts, deriveRisks, type Snapshot } from '@/lib/engine/rules';
import { interpret, type EngineOutput } from '@/lib/engine/peacekeeper';
import { buildEntityIndex, guardClaims, contextInputHash, type Citation, type GuardedClaim } from '@/lib/engine/weaver';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Deterministic risks cite the fact that produced them (source of truth for the UI).
const RISK_FACT_CITATION: Record<string, string> = {
  budget: 'projected_overage',
  timeline: 'overdue_tasks',
  decision_bottleneck: 'open_decisions',
  vendor_booking: 'missing_vendors',
};
function deterministicRiskCitations(riskType: string): Citation[] {
  const kind = RISK_FACT_CITATION[riskType];
  return kind ? [{ type: 'fact', id: kind }] : [];
}

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

function recommendationRows(
  workspaceId: string,
  engineRunId: string,
  output: EngineOutput,
  keptNextActions: GuardedClaim[],
) {
  const base = { workspace_id: workspaceId, engine_run_id: engineRunId, priority: 'med', source: 'ai', citations_json: [] as Citation[] };
  return [
    // next_action rows come from the GUARDED set only (each carries grounded citations).
    ...keptNextActions.map((item) => ({
      ...base,
      title: item.title,
      description: item.detail ?? null,
      recommendation_type: 'next_action',
      reason: item.detail ?? null,
      citations_json: item.citations,
    })),
    ...output.openDecisions.map((title) => ({ ...base, title, recommendation_type: 'decision_prompt' })),
    ...output.budgetGuidance.map((title) => ({ ...base, title, recommendation_type: 'budget_guidance' })),
    ...output.vendorGaps.map((title) => ({ ...base, title, recommendation_type: 'vendor_gap' })),
    ...output.guestImpact.map((title) => ({ ...base, title, recommendation_type: 'guest_impact' })),
    ...output.dreamAlignment.map((title) => ({ ...base, title, recommendation_type: 'compass_check' })),
    ...output.poofSuggestions.map((item) => ({
      ...base,
      title: item.why,
      description: item.why,
      recommendation_type: 'poof_suggestion',
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
    const { output, model, promptVersion, usage, raw } = await interpret(context);
    const deterministicRisks = deriveRisks(snapshot);

    // Deterministic guard: only AI insights that cite something real in the context survive.
    const idx = buildEntityIndex(context);
    const naGuard = guardClaims(
      output.nextActions.map((a) => ({ type: 'next_action', title: a.title, detail: a.reason, citations: a.citations })),
      idx,
    );
    const aiRiskGuard = guardClaims(
      output.risks.map((r) => ({ type: riskType(r.type), title: r.title, detail: r.severity, citations: r.citations })),
      idx,
    );
    const aiClaimTotal = output.nextActions.length + output.risks.length;
    const aiClaimKept = naGuard.kept.length + aiRiskGuard.kept.length;
    const citationCoverage = aiClaimTotal === 0 ? 1 : Number((aiClaimKept / aiClaimTotal).toFixed(4));

    const recommendations = recommendationRows(args.workspaceId, run.id, output, naGuard.kept);
    const risks = [
      ...deterministicRisks.map((risk) => ({
        workspace_id: args.workspaceId,
        engine_run_id: run.id,
        risk_type: risk.type,
        severity: risk.severity,
        title: risk.title,
        source: 'deterministic',
        citations_json: deterministicRiskCitations(risk.type),
      })),
      ...aiRiskGuard.kept.map((risk) => ({
        workspace_id: args.workspaceId,
        engine_run_id: run.id,
        risk_type: riskType(risk.type),          // claim.type was already riskType(r.type)
        severity: risk.detail ?? 'med',          // AI severity was carried in `detail`
        title: risk.title,
        source: 'ai',
        citations_json: risk.citations,
      })),
    ];

    await Promise.all([
      recommendations.length ? db.from('planning_recommendations').insert(recommendations) : Promise.resolve({ error: null }),
      risks.length ? db.from('planning_risks').insert(risks) : Promise.resolve({ error: null }),
      db.from('planning_engine_runs').update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        summary: output.planningSummary,
        model,
        prompt_version: promptVersion,
        input_hash: contextInputHash(context),
        output_json: output as unknown as Record<string, unknown>,
        usage_json: usage,
        citation_coverage: citationCoverage,
      }).eq('id', run.id),
    ]);

    return { runId: run.id as string, output, citationCoverage, droppedInsights: naGuard.dropped.length + aiRiskGuard.dropped.length };
  } catch (error) {
    await db
      .from('planning_engine_runs')
      .update({ status: 'failed', completed_at: new Date().toISOString(), summary: error instanceof Error ? error.message : 'Peace Engine failed' })
      .eq('id', run.id);
    throw error;
  }
}
