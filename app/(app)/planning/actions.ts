'use server';

import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireActiveWorkspace } from '@/lib/workspace/current';
import { emitRipple } from '@/lib/engine/ripple';
import { deriveDecisionRipple } from '@/lib/engine/decision-ripple';

// Decision statuses that represent a settled outcome worth rippling.
const SETTLED_DECISION_STATUSES = new Set(['approved', 'rejected', 'changed', 'deferred']);

async function requirePlanWrite() {
  const workspace = await requireActiveWorkspace();
  if (!can(workspace.role, 'plan.full')) throw new Error('You do not have permission to edit this plan');
  return workspace;
}

function flag(formData: FormData, key: string) { return formData.get(key) === 'on'; }
function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberValue(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function createVendor(formData: FormData) {
  const workspace = await requirePlanWrite();
  const name = text(formData, 'name');
  if (!name) throw new Error('Vendor name is required');

  const db = supabaseAdmin();
  const { error } = await db.from('vendors').insert({
    workspace_id: workspace.id,
    name,
    category: text(formData, 'category') ?? 'other',
    website: text(formData, 'website'),
    contact_name: text(formData, 'contact_name'),
    email: text(formData, 'email'),
    phone: text(formData, 'phone'),
    status: text(formData, 'status') ?? 'idea',
    quote_amount: numberValue(formData, 'quote_amount'),
    inquiry_date: text(formData, 'inquiry_date'),
    response_date: text(formData, 'response_date'),
    availability: text(formData, 'availability'),
    contract_status: text(formData, 'contract_status'),
    deposit_amount: numberValue(formData, 'deposit_amount'),
    payment_schedule: text(formData, 'payment_schedule'),
    cancellation_terms: text(formData, 'cancellation_terms'),
    insurance_required: flag(formData, 'insurance_required'),
    meals_required: flag(formData, 'meals_required'),
    arrival_time: text(formData, 'arrival_time'),
    departure_time: text(formData, 'departure_time'),
    setup_time: text(formData, 'setup_time'),
    breakdown_time: text(formData, 'breakdown_time'),
    internal_notes: text(formData, 'internal_notes'),
    created_by: workspace.userId,
  });
  if (error) throw error;
  revalidatePath('/vendors');
}

export async function updateVendorStatus(formData: FormData) {
  const workspace = await requirePlanWrite();
  const id = text(formData, 'id');
  const status = text(formData, 'status');
  if (!id || !status) throw new Error('Vendor and status are required');

  const { data: updated, error } = await supabaseAdmin()
    .from('vendors')
    .update({ status })
    .eq('id', id)
    .eq('workspace_id', workspace.id)
    .select('id, name, category, status')
    .single();
  if (error) throw error;

  // Ripple: a vendor status change (esp. → booked) touches budget, timeline, seating. Non-blocking.
  await emitRipple(workspace.id, {
    sourceType: 'vendor',
    sourceId: id,
    changeKind: 'status_changed',
    category: updated?.category ?? undefined,
    summary: updated?.name ? `${updated.name} — ${status}` : `Vendor ${status}`,
    createdBy: workspace.userId,
  });
  revalidatePath('/vendors');
}

export async function deleteVendor(formData: FormData) {
  const workspace = await requirePlanWrite();
  const id = text(formData, 'id');
  if (!id) throw new Error('Vendor is required');

  const { error } = await supabaseAdmin().from('vendors').delete().eq('id', id).eq('workspace_id', workspace.id);
  if (error) throw error;
  revalidatePath('/vendors');
}

export async function createBudgetCategory(formData: FormData) {
  const workspace = await requirePlanWrite();
  const name = text(formData, 'name');
  if (!name) throw new Error('Category name is required');

  const db = supabaseAdmin();
  const { count } = await db
    .from('budget_categories')
    .select('id', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id);
  const { error } = await db.from('budget_categories').insert({
    workspace_id: workspace.id,
    name,
    planned_amount: numberValue(formData, 'planned_amount'),
    sort: count ?? 0,
  });
  if (error) throw error;
  revalidatePath('/budget');
}

export async function createBudgetItem(formData: FormData) {
  const workspace = await requirePlanWrite();
  const title = text(formData, 'title');
  if (!title) throw new Error('Budget item title is required');

  const { data: created, error } = await supabaseAdmin().from('budget_items').insert({
    workspace_id: workspace.id,
    category_id: text(formData, 'category_id'),
    title,
    estimated_cost: numberValue(formData, 'estimated_cost'),
    committed_cost: numberValue(formData, 'committed_cost'),
    paid_amount: numberValue(formData, 'paid_amount'),
    notes: text(formData, 'notes'),
    created_by: workspace.userId,
  }).select('id').single();
  if (error) throw error;

  // Ripple: a new/changed budget line shifts totals + payment schedule. Non-blocking.
  await emitRipple(workspace.id, {
    sourceType: 'budget_item',
    sourceId: created?.id ?? undefined,
    changeKind: 'created',
    summary: `Budget item added — ${title}`,
    createdBy: workspace.userId,
  });
  revalidatePath('/budget');
}

export async function deleteBudgetItem(formData: FormData) {
  const workspace = await requirePlanWrite();
  const id = text(formData, 'id');
  if (!id) throw new Error('Budget item is required');

  const { error } = await supabaseAdmin().from('budget_items').delete().eq('id', id).eq('workspace_id', workspace.id);
  if (error) throw error;
  revalidatePath('/budget');
}

export async function createDecision(formData: FormData) {
  const workspace = await requirePlanWrite();
  const title = text(formData, 'title');
  if (!title) throw new Error('Decision title is required');

  const { error } = await supabaseAdmin().from('decisions').insert({
    workspace_id: workspace.id,
    title,
    description: text(formData, 'description'),
    category: text(formData, 'category') ?? 'design',
    status: text(formData, 'status') ?? 'open',
    due_date: text(formData, 'due_date'),
    final_choice: text(formData, 'final_choice'),
    rationale: text(formData, 'rationale'),
    created_by: workspace.userId,
  });
  if (error) throw error;
  revalidatePath('/decisions');
}

export async function updateDecisionStatus(formData: FormData) {
  const workspace = await requirePlanWrite();
  const id = text(formData, 'id');
  const status = text(formData, 'status');
  if (!id || !status) throw new Error('Decision and status are required');

  const { data: updated, error } = await supabaseAdmin()
    .from('decisions')
    .update({ status })
    .eq('id', id)
    .eq('workspace_id', workspace.id)
    .select('id, title, category')
    .single();
  if (error) throw error;

  // Ripple: a settled decision has consequences elsewhere. Non-blocking.
  if (SETTLED_DECISION_STATUSES.has(status)) {
    await emitRipple(workspace.id, {
      sourceType: 'decision',
      sourceId: id,
      changeKind: status,
      category: updated?.category ?? undefined,
      summary: updated?.title ? `${updated.title} — ${status}` : `Decision ${status}`,
      createdBy: workspace.userId,
    });
  }
  revalidatePath('/decisions');
}

export async function deleteDecision(formData: FormData) {
  const workspace = await requirePlanWrite();
  const id = text(formData, 'id');
  if (!id) throw new Error('Decision is required');

  const { error } = await supabaseAdmin().from('decisions').delete().eq('id', id).eq('workspace_id', workspace.id);
  if (error) throw error;
  revalidatePath('/decisions');
}

export async function createTask(formData: FormData) {
  const workspace = await requirePlanWrite();
  const title = text(formData, 'title');
  if (!title) throw new Error('Task title is required');

  const { error } = await supabaseAdmin().from('tasks').insert({
    workspace_id: workspace.id,
    title,
    category: text(formData, 'category') ?? 'venue',
    status: text(formData, 'status') ?? 'not_started',
    due_date: text(formData, 'due_date'),
    priority: text(formData, 'priority') ?? 'med',
    created_by: workspace.userId,
  });
  if (error) throw error;
  revalidatePath('/timeline');
}

export async function updateTaskStatus(formData: FormData) {
  const workspace = await requirePlanWrite();
  const id = text(formData, 'id');
  const status = text(formData, 'status');
  if (!id || !status) throw new Error('Task and status are required');

  const { error } = await supabaseAdmin()
    .from('tasks')
    .update({ status })
    .eq('id', id)
    .eq('workspace_id', workspace.id);
  if (error) throw error;
  revalidatePath('/timeline');
}

export async function deleteTask(formData: FormData) {
  const workspace = await requirePlanWrite();
  const id = text(formData, 'id');
  if (!id) throw new Error('Task is required');

  const { error } = await supabaseAdmin().from('tasks').delete().eq('id', id).eq('workspace_id', workspace.id);
  if (error) throw error;
  revalidatePath('/timeline');
}

export async function createTimelineEvent(formData: FormData) {
  const workspace = await requirePlanWrite();
  const title = text(formData, 'title');
  if (!title) throw new Error('Event title is required');

  const { error } = await supabaseAdmin().from('events').insert({
    workspace_id: workspace.id,
    kind: text(formData, 'kind') ?? 'planning_task',
    title,
    date: text(formData, 'date'),
    time: text(formData, 'time'),
    location: text(formData, 'location'),
    notes: text(formData, 'notes'),
    visibility: text(formData, 'visibility') ?? 'private',
  });
  if (error) throw error;
  revalidatePath('/timeline');
}

export async function deleteTimelineEvent(formData: FormData) {
  const workspace = await requirePlanWrite();
  const id = text(formData, 'id');
  if (!id) throw new Error('Event is required');

  const { error } = await supabaseAdmin().from('events').delete().eq('id', id).eq('workspace_id', workspace.id);
  if (error) throw error;
  revalidatePath('/timeline');
}

export async function createDocumentRecord(formData: FormData) {
  const workspace = await requirePlanWrite();
  const title = text(formData, 'title');
  if (!title) throw new Error('Document title is required');

  const { error } = await supabaseAdmin().from('documents').insert({
    workspace_id: workspace.id,
    folder: text(formData, 'folder') ?? 'misc',
    title,
    created_by: workspace.userId,
  });
  if (error) throw error;
  revalidatePath('/documents');
}

export async function deleteDocumentRecord(formData: FormData) {
  const workspace = await requirePlanWrite();
  const id = text(formData, 'id');
  if (!id) throw new Error('Document is required');

  const { error } = await supabaseAdmin().from('documents').delete().eq('id', id).eq('workspace_id', workspace.id);
  if (error) throw error;
  const { markOutputsStale } = await import('@/app/(app)/outputs/actions');
  await markOutputsStale(workspace.id, ['document-index']);
  revalidatePath('/documents');
}

export async function addDecisionOption(formData: FormData) {
  const workspace = await requirePlanWrite();
  const decisionId = text(formData, 'decision_id');
  const label = text(formData, 'label');
  if (!decisionId || !label) throw new Error('An option needs a decision and a label');
  const { error } = await supabaseAdmin().from('decision_options').insert({ decision_id: decisionId, label, detail: text(formData, 'detail') });
  if (error) throw error;
  revalidatePath('/decisions');
}

export async function voteDecisionOption(formData: FormData) {
  const workspace = await requirePlanWrite();
  const decisionId = text(formData, 'decision_id');
  const optionId = text(formData, 'option_id');
  if (!decisionId || !optionId) throw new Error('A vote needs a decision and an option');
  const { error } = await supabaseAdmin()
    .from('decision_votes')
    .upsert({ decision_id: decisionId, option_id: optionId, user_id: workspace.userId }, { onConflict: 'decision_id,user_id' });
  if (error) throw error;
  revalidatePath('/decisions');
}

export interface DecisionSaveResult {
  ok: boolean;
  conflict?: {
    base: Record<string, unknown>;
    mine: Record<string, unknown>;
    theirs: Record<string, unknown>;
    currentVersion: number;
  };
}

function jsonObject(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export async function setDecisionFinal(formData: FormData): Promise<DecisionSaveResult> {
  const workspace = await requirePlanWrite();
  const id = text(formData, 'id');
  if (!id) throw new Error('Decision is required');
  const db = supabaseAdmin();
  const { data: current, error: currentError } = await db
    .from('decisions')
    .select('id, title, category, final_choice, rationale, linked_dream_value, linked_dream_ids, affected_objects_json, status, version')
    .eq('id', id)
    .eq('workspace_id', workspace.id)
    .single();
  if (currentError) throw currentError;

  const status = text(formData, 'status') ?? 'approved';
  const finalChoice = text(formData, 'final_choice');
  const rationale = text(formData, 'rationale');
  const linkedDreamValue = text(formData, 'linked_dream_value');
  const linkedDreamId = text(formData, 'linked_dream_id');
  const baseVersion = Number(text(formData, 'base_version') ?? current.version ?? 1);
  const base = jsonObject(text(formData, 'base_json'));
  const mine: Record<string, unknown> = {
    final_choice: finalChoice,
    rationale,
    linked_dream_value: linkedDreamValue,
    status,
  };
  const theirs: Record<string, unknown> = {
    final_choice: current.final_choice,
    rationale: current.rationale,
    linked_dream_value: current.linked_dream_value,
    status: current.status,
  };

  if (baseVersion !== Number(current.version ?? 1) && text(formData, 'force') !== 'true') {
    return {
      ok: false,
      conflict: { base, mine, theirs, currentVersion: Number(current.version ?? 1) },
    };
  }

  const affectedObjects = deriveDecisionRipple(current.category, current.final_choice, finalChoice);
  const update: Record<string, unknown> = {
    final_choice: finalChoice,
    rationale,
    linked_dream_value: linkedDreamValue,
    linked_dream_ids: linkedDreamId ? [linkedDreamId] : current.linked_dream_ids ?? [],
    affected_objects_json: affectedObjects,
    status,
    version: Number(current.version ?? 1) + 1,
  };
  if (status === 'approved') { update.approved_by = workspace.userId; update.approved_at = new Date().toISOString(); }
  const { data: updated, error } = await db
    .from('decisions')
    .update(update)
    .eq('id', id)
    .eq('workspace_id', workspace.id)
    .eq('version', current.version)
    .select('version')
    .maybeSingle();
  if (error) throw error;
  if (!updated) {
    const { data: latest } = await db
      .from('decisions')
      .select('final_choice, rationale, linked_dream_value, status, version')
      .eq('id', id)
      .eq('workspace_id', workspace.id)
      .single();
    return {
      ok: false,
      conflict: {
        base,
        mine,
        theirs: {
          final_choice: latest?.final_choice,
          rationale: latest?.rationale,
          linked_dream_value: latest?.linked_dream_value,
          status: latest?.status,
        },
        currentVersion: Number(latest?.version ?? current.version ?? 1),
      },
    };
  }

  if (SETTLED_DECISION_STATUSES.has(status)) {
    await emitRipple(workspace.id, {
      sourceType: 'decision',
      sourceId: id,
      changeKind: status,
      category: current.category,
      summary: `${current.title} — ${status}`,
      createdBy: workspace.userId,
      impact: affectedObjects.map((object) => ({
        area: object.type,
        note: object.note,
        severity: object.severity,
      })),
    });
  }
  await db.from('audit_events').insert({
    workspace_id: workspace.id,
    actor_id: workspace.userId,
    action: 'decision_settled',
    entity_type: 'decision',
    entity_id: id,
    meta: { status, affected_object_types: affectedObjects.map((object) => object.type) },
  });
  revalidatePath('/decisions');
  revalidatePath('/peace-center');
  revalidatePath('/budget');
  revalidatePath('/timeline');
  revalidatePath('/seating');
  revalidatePath('/printables');
  return { ok: true };
}

export async function createMilestone(formData: FormData) {
  const workspace = await requirePlanWrite();
  const title = text(formData, 'title');
  if (!title) throw new Error('A milestone needs a title');
  const { error } = await supabaseAdmin().from('milestones').insert({ workspace_id: workspace.id, title, target_date: text(formData, 'target_date') });
  if (error) throw error;
  revalidatePath('/timeline');
}

export async function deleteMilestone(formData: FormData) {
  const workspace = await requirePlanWrite();
  const id = text(formData, 'id');
  if (!id) throw new Error('Milestone is required');
  await supabaseAdmin().from('milestones').delete().eq('id', id).eq('workspace_id', workspace.id);
  revalidatePath('/timeline');
}

export async function createDependency(formData: FormData) {
  const workspace = await requirePlanWrite();
  const source = text(formData, 'source_task_id');
  const dependsOn = text(formData, 'depends_on_task_id');
  if (!source || !dependsOn || source === dependsOn) throw new Error('Pick two different tasks');
  const { error } = await supabaseAdmin().from('planning_dependencies').insert({
    workspace_id: workspace.id,
    source_entity_type: 'task', source_entity_id: source,
    depends_on_entity_type: 'task', depends_on_entity_id: dependsOn,
    dependency_reason: text(formData, 'reason'),
  });
  if (error) throw error;
  revalidatePath('/timeline');
}

export async function deleteDependency(formData: FormData) {
  const workspace = await requirePlanWrite();
  const id = text(formData, 'id');
  if (!id) throw new Error('Dependency is required');
  await supabaseAdmin().from('planning_dependencies').delete().eq('id', id).eq('workspace_id', workspace.id);
  revalidatePath('/timeline');
}
