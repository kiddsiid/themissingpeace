'use server';

import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { estimateMoneyMap } from '@/lib/engine/money-map';
import { emitRipple } from '@/lib/engine/ripple';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireActiveWorkspace } from '@/lib/workspace/current';

async function requireMoneyMapWrite() {
  const workspace = await requireActiveWorkspace();
  if (!can(workspace.role, 'plan.full')) throw new Error('You do not have permission to edit Money Map');
  return workspace;
}

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function numberValue(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;
  const normalized = value.replace(/[$,]/g, '');
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function dateValue(formData: FormData, key: string) {
  const value = text(formData, key);
  return value || null;
}

async function insertOptional(table: string, payload: Record<string, unknown>) {
  const { error } = await supabaseAdmin().from(table).insert(payload);
  if (error && !['42P01', 'PGRST205'].includes(error.code ?? '')) throw error;
}

export async function saveMoneyMapSetup(formData: FormData) {
  const workspace = await requireMoneyMapWrite();
  const db = supabaseAdmin();
  const location = text(formData, 'location');
  const weddingType = text(formData, 'wedding_type') ?? 'local';
  const guestCount = numberValue(formData, 'guest_count');
  const targetBudget = numberValue(formData, 'target_budget');
  const budgetConfidence = text(formData, 'budget_confidence') ?? 'unknown';

  const { error: profileError } = await db
    .from('wedding_profiles')
    .update({
      guest_estimate: guestCount,
      budget_total: targetBudget,
      budget_confidence: budgetConfidence,
    })
    .eq('workspace_id', workspace.id);
  if (profileError) throw profileError;

  // Ripple: a guest-estimate change recomputes per-guest cost, seating capacity, feast counts.
  if (guestCount != null) {
    await emitRipple(workspace.id, {
      sourceType: 'guest_count',
      changeKind: 'updated',
      summary: `Guest estimate set to ~${guestCount}`,
      createdBy: workspace.userId,
    });
  }

  const { error: budgetError } = await db.from('budgets').upsert({
    workspace_id: workspace.id,
    total: targetBudget,
    confidence: budgetConfidence,
  }, { onConflict: 'workspace_id' });
  if (budgetError) throw budgetError;

  const extended = await db
    .from('wedding_profiles')
    .update({ wedding_location: location, wedding_type: weddingType })
    .eq('workspace_id', workspace.id);
  if (extended.error && !['42703', 'PGRST204', 'PGRST205'].includes(extended.error.code ?? '')) throw extended.error;

  const estimate = estimateMoneyMap({
    location,
    guestCount,
    targetBudget,
    weddingType,
    budgetConfidence,
    dreamPriorities: String(formData.get('dream_priorities') || '').split('|').filter(Boolean),
  });

  await insertOptional('cost_estimate_runs', {
    workspace_id: workspace.id,
    location_text: location,
    guest_count: guestCount,
    target_budget: targetBudget,
    wedding_type: weddingType,
    budget_confidence: budgetConfidence,
    input_json: {
      location,
      guestCount,
      targetBudget,
      weddingType,
      budgetConfidence,
    },
    output_json: estimate,
    created_by: workspace.userId,
  });

  await db.from('audit_events').insert({
    workspace_id: workspace.id,
    actor_id: workspace.userId,
    action: 'money_map_setup_saved',
    entity_type: 'money_map',
    entity_id: workspace.id,
    meta: { location, guestCount, targetBudget, weddingType, budgetConfidence },
  });

  revalidatePath('/budget');
  revalidatePath('/peace-center');
}

export async function createMoneyMapCategory(formData: FormData) {
  const workspace = await requireMoneyMapWrite();
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

export async function createMoneyMapItem(formData: FormData) {
  const workspace = await requireMoneyMapWrite();
  const title = text(formData, 'title');
  if (!title) throw new Error('Money Map item title is required');

  const { error } = await supabaseAdmin().from('budget_items').insert({
    workspace_id: workspace.id,
    category_id: text(formData, 'category_id'),
    vendor_id: text(formData, 'vendor_id'),
    title,
    estimated_cost: numberValue(formData, 'estimated_cost'),
    quoted_cost: numberValue(formData, 'quoted_cost'),
    committed_cost: numberValue(formData, 'committed_cost'),
    paid_amount: numberValue(formData, 'paid_amount'),
    deposit_due: dateValue(formData, 'deposit_due'),
    final_due: dateValue(formData, 'final_due'),
    notes: text(formData, 'notes'),
    created_by: workspace.userId,
  });
  if (error) throw error;
  revalidatePath('/budget');
  revalidatePath('/peace-center');
}

export async function deleteMoneyMapItem(formData: FormData) {
  const workspace = await requireMoneyMapWrite();
  const id = text(formData, 'id');
  if (!id) throw new Error('Money Map item is required');

  const { error } = await supabaseAdmin().from('budget_items').delete().eq('id', id).eq('workspace_id', workspace.id);
  if (error) throw error;
  revalidatePath('/budget');
  revalidatePath('/peace-center');
}

export async function createPaymentMilestone(formData: FormData) {
  const workspace = await requireMoneyMapWrite();
  const title = text(formData, 'title');
  if (!title) throw new Error('Payment title is required');

  const { error } = await supabaseAdmin().from('payment_milestones').insert({
    workspace_id: workspace.id,
    budget_item_id: text(formData, 'budget_item_id'),
    vendor_id: text(formData, 'vendor_id'),
    title,
    amount: numberValue(formData, 'amount'),
    due_date: dateValue(formData, 'due_date'),
    reminder_date: dateValue(formData, 'reminder_date'),
    status: text(formData, 'status') ?? 'planned',
    responsible_name: text(formData, 'responsible_name'),
    milestone_kind: text(formData, 'milestone_kind') ?? 'payment',
    notes: text(formData, 'notes'),
    created_by: workspace.userId,
  });
  if (error) throw error;
  revalidatePath('/budget');
}

export async function updatePaymentMilestoneStatus(formData: FormData) {
  const workspace = await requireMoneyMapWrite();
  const id = text(formData, 'id');
  const status = text(formData, 'status');
  if (!id || !status) throw new Error('Payment and status are required');

  const { error } = await supabaseAdmin()
    .from('payment_milestones')
    .update({ status, paid_at: status === 'paid' ? new Date().toISOString() : null })
    .eq('id', id)
    .eq('workspace_id', workspace.id);
  if (error) throw error;
  revalidatePath('/budget');
}

export async function createContribution(formData: FormData) {
  const workspace = await requireMoneyMapWrite();
  const contributorName = text(formData, 'contributor_name');
  if (!contributorName) throw new Error('Contributor name is required');

  const { error } = await supabaseAdmin().from('budget_contributions').insert({
    workspace_id: workspace.id,
    contributor_name: contributorName,
    promised_amount: numberValue(formData, 'promised_amount'),
    received_amount: numberValue(formData, 'received_amount'),
    intended_for: text(formData, 'intended_for'),
    visibility: text(formData, 'visibility') ?? 'private',
    notes: text(formData, 'notes'),
    created_by: workspace.userId,
  });
  if (error) throw error;
  revalidatePath('/budget');
}

export async function createBudgetScenario(formData: FormData) {
  const workspace = await requireMoneyMapWrite();
  const name = text(formData, 'name');
  if (!name) throw new Error('Scenario name is required');

  const { error } = await supabaseAdmin().from('budget_scenarios').insert({
    workspace_id: workspace.id,
    name,
    wedding_type: text(formData, 'wedding_type') ?? 'local',
    guest_count: numberValue(formData, 'guest_count'),
    target_budget: numberValue(formData, 'target_budget'),
    projected_total: numberValue(formData, 'projected_total'),
    budget_fit: text(formData, 'budget_fit'),
    tradeoff_notes: text(formData, 'tradeoff_notes'),
    created_by: workspace.userId,
  });
  if (error) throw error;
  revalidatePath('/budget');
}
