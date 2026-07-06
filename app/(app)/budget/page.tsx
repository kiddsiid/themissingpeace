import { redirect } from 'next/navigation';
import { MoneyMapWorkspace } from '@/app/(app)/budget/MoneyMapWorkspace';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';
import type { DreamResponses } from '@/lib/engine/compass';

export default async function BudgetPage() {
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect('/onboarding');

  const db = supabaseAdmin();
  const [
    profileBaseRes,
    profileExtendedRes,
    catsRes,
    itemsRes,
    vendorsRes,
    paymentsRes,
    contributionsRes,
    scenariosRes,
    dreamRes,
    compassRes,
  ] = await Promise.all([
    db.from('wedding_profiles').select('budget_total, budget_confidence, guest_estimate, guest_max').eq('workspace_id', workspace.id).maybeSingle(),
    db.from('wedding_profiles').select('wedding_location, wedding_type').eq('workspace_id', workspace.id).maybeSingle(),
    db.from('budget_categories').select('id, name, planned_amount, sort').eq('workspace_id', workspace.id).order('sort', { ascending: true }),
    db.from('budget_items').select('id, category_id, vendor_id, title, estimated_cost, quoted_cost, committed_cost, paid_amount, deposit_due, final_due, notes').eq('workspace_id', workspace.id).order('created_at', { ascending: true }),
    db.from('vendors').select('id, name, category, status, quote_amount').eq('workspace_id', workspace.id).order('name', { ascending: true }),
    db.from('payment_milestones').select('id, title, amount, due_date, status, budget_item_id, vendor_id, responsible_name').eq('workspace_id', workspace.id).order('due_date', { ascending: true }),
    db.from('budget_contributions').select('id, contributor_name, promised_amount, received_amount, intended_for, visibility').eq('workspace_id', workspace.id).order('created_at', { ascending: false }),
    db.from('budget_scenarios').select('id, name, wedding_type, guest_count, target_budget, projected_total, budget_fit, tradeoff_notes').eq('workspace_id', workspace.id).order('created_at', { ascending: false }),
    db.from('dreams').select('responses_json').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('wedding_compass').select('summary, tone, priorities_json').eq('workspace_id', workspace.id).maybeSingle(),
  ]);

  const profile = {
    ...(profileBaseRes.data ?? {}),
    ...(profileExtendedRes.data ?? {}),
  };

  return (
    <MoneyMapWorkspace
      profile={profile}
      categories={catsRes.data ?? []}
      items={itemsRes.data ?? []}
      vendors={vendorsRes.data ?? []}
      payments={paymentsRes.data ?? []}
      contributions={contributionsRes.data ?? []}
      scenarios={scenariosRes.data ?? []}
      dream={(dreamRes.data?.responses_json ?? null) as DreamResponses | null}
      compass={compassRes.data}
    />
  );
}
