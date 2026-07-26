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
    decisionsRes,
    guestCountRes,
    rippleRes,
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
    db.from('decisions').select('title, category, final_choice, status, updated_at').eq('workspace_id', workspace.id).in('status', ['approved', 'changed']).order('updated_at', { ascending: false }).limit(4),
    db.from('guests').select('id', { count: 'exact', head: true }).eq('workspace_id', workspace.id).neq('rsvp_status', 'declined'),
    db.from('ripple_events').select('summary, source_type, created_at').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
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
      projectionDrivers={[
        { label: 'Guest list', value: `${guestCountRes.count ?? Number(profile.guest_estimate ?? 0)} invited or attending`, source: 'Guests' },
        { label: 'Vendor reality', value: `${(vendorsRes.data ?? []).filter((vendor: any) => ['booked', 'contracted'].includes(vendor.status)).length} booked · ${(vendorsRes.data ?? []).filter((vendor: any) => vendor.quote_amount).length} quoted`, source: 'Vendors' },
        { label: 'Settled choices', value: `${decisionsRes.data?.length ?? 0} decisions shaping guidance`, source: 'Decision ledger' },
        { label: 'Planning profile', value: profile.wedding_location || profile.wedding_type || 'Still flexible', source: 'Wedding profile' },
      ]}
      latestChange={rippleRes.data ? `${rippleRes.data.summary} · ${new Date(rippleRes.data.created_at).toLocaleDateString()}` : null}
    />
  );
}
