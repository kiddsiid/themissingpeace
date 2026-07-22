import Link from 'next/link';
import { redirect } from 'next/navigation';
import { runPeaceEngineAction } from '@/app/(app)/peace-center/actions';
import { InviteCircle } from '@/components/InviteCircle';
import { can } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';
import type { DreamResponses } from '@/lib/engine/compass';
import type { Citation } from '@/lib/engine/weaver';
import { InsightActions } from '@/components/peace/InsightActions';
import { RippleFeed, type RippleRow } from '@/components/peace/RippleFeed';

function timeAgo(iso?: string | null): string {
  if (!iso) return '';
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? 'yesterday' : `${days}d ago`;
}

function money(value: number | string | null | undefined) {
  if (value == null || value === '') return 'Missing';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(Number(value));
}

function label(value?: string | null) {
  return value ? value.replace(/_/g, ' ') : 'Not set';
}

function nameOf(user?: { name?: string | null; display_name?: string | null } | null): string {
  return (user?.display_name || user?.name || 'Someone') as string;
}

function initials(name: string): string {
  return name.split(/\s+/).map((word) => word[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '+';
}

function Avatar({ name, url, size = 26 }: { name: string; url?: string | null; size?: number }) {
  if (url) return <img src={url} alt={name} width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return (
    <span className="inline-flex items-center justify-center rounded-full bg-[var(--gold-bg)] text-[var(--gold)]" style={{ width: size, height: size, fontSize: size * 0.4 }} title={name}>
      {initials(name)}
    </span>
  );
}

function moduleFor(type?: string | null) {
  const value = String(type ?? '').toLowerCase();
  if (value.includes('dream') || value.includes('compass')) return { label: 'Dream', href: '/dream' };
  if (value.includes('board')) return { label: 'The Board', href: '/board' };
  if (value.includes('decision')) return { label: 'Decisions', href: '/decisions' };
  if (value.includes('budget')) return { label: 'Money Map', href: '/budget' };
  if (value.includes('vendor')) return { label: 'Vendors', href: '/vendors' };
  if (value.includes('guest')) return { label: 'Guests', href: '/guests' };
  if (value.includes('timeline') || value.includes('task') || value.includes('event')) return { label: 'Timeline', href: '/timeline' };
  if (value.includes('document')) return { label: 'Documents', href: '/documents' };
  if (value.includes('playlist') || value.includes('music')) return { label: 'Playlist', href: '/playlist' };
  if (value.includes('honeymoon')) return { label: 'Honeymoon', href: '/honeymoon' };
  return { label: 'Peace Center', href: '/peace-center' };
}

function dreamStatus(dream: DreamResponses | null, hasCompass: boolean) {
  if (!dream) return 'Not started';
  const filled = [
    dream.partnerOneReflection,
    dream.partnerTwoReflection,
    dream.sharedMeaning || dream.meaning,
    dream.hospitalityMeaning,
    dream.musicAtmosphere,
    dream.familyMeaning,
    dream.budgetValues,
    ...(dream.priorities ?? []),
    ...(dream.nonNegotiables ?? []),
    ...(dream.avoid ?? []),
  ].filter(Boolean).length;
  if (filled < 3) return 'In progress';
  if (!hasCompass) return 'Ready to reveal';
  if (dream.compassApproved) return 'Compass approved';
  return 'Compass ready';
}

function ScoreCard({ label: score }: { label: string }) {
  const color = score === 'Peaceful' ? 'bg-[var(--sage-bg)] text-[#566049]' : score === 'At risk' ? 'bg-[var(--clay-bg)] text-[var(--clay-ink)]' : 'bg-[var(--gold-bg)] text-[var(--gold)]';
  return <span className={`motion-soft-pulse rounded-full px-3 py-1 text-xs ${color}`}>{score}</span>;
}

export default async function PeaceCenter() {
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect('/onboarding');

  const db = supabaseAdmin();
  const [
    profileRes,
    dreamRes,
    compassRes,
    recsRes,
    risksRes,
    membersRes,
    itemsRes,
    vendorsRecentRes,
    vendorsAllRes,
    decisionsRes,
    docsRes,
    budgetItemsRes,
    budgetCatsRes,
    guestsRes,
  ] = await Promise.all([
    db.from('wedding_profiles').select('planning_stage, guest_estimate, guest_max, budget_total, budget_confidence, honeymoon_enabled').eq('workspace_id', workspace.id).maybeSingle(),
    db.from('dreams').select('responses_json, created_at').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    db.from('wedding_compass').select('summary, tone').eq('workspace_id', workspace.id).maybeSingle(),
    db.from('planning_recommendations').select('id, title, description, recommendation_type, priority, reason, linked_entity_type, suggested_owner_id, suggested_due_date, status, created_at, citations_json, source').eq('workspace_id', workspace.id).eq('status', 'new').order('created_at', { ascending: false }).limit(5),
    db.from('planning_risks').select('id, risk_type, severity, title, description, suggested_resolution, status, created_at').eq('workspace_id', workspace.id).eq('status', 'open').order('created_at', { ascending: false }).limit(12),
    db.from('workspace_members').select('role, user_id').eq('workspace_id', workspace.id).eq('status', 'active'),
    db.from('board_items').select('id, title, created_at, created_by').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(6),
    db.from('vendors').select('id, name, created_at, created_by').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(4),
    db.from('vendors').select('id, name, category, status, quote_amount').eq('workspace_id', workspace.id),
    db.from('decisions').select('id, title, category, status, due_date, created_at, created_by').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(12),
    db.from('documents').select('id, title, folder, created_at, created_by').eq('workspace_id', workspace.id).order('created_at', { ascending: false }).limit(4),
    db.from('budget_items').select('id, title, estimated_cost, quoted_cost, committed_cost, paid_amount').eq('workspace_id', workspace.id),
    db.from('budget_categories').select('id, name, planned_amount').eq('workspace_id', workspace.id),
    db.from('guests').select('id, is_child, rsvp_status, traveling_from, meal_choice').eq('workspace_id', workspace.id),
  ]);

  const profile = profileRes.data;
  const dream = (dreamRes.data?.responses_json ?? null) as DreamResponses | null;
  const compass = compassRes.data;
  const recommendations = recsRes.data ?? [];
  const risks = risksRes.data ?? [];
  const vendors = vendorsAllRes.data ?? [];
  const decisions = decisionsRes.data ?? [];
  const budgetItems = budgetItemsRes.data ?? [];
  const budgetCats = budgetCatsRes.data ?? [];
  const guests = guestsRes.data ?? [];

  const ids = new Set<string>();
  (membersRes.data ?? []).forEach((member: any) => member.user_id && ids.add(member.user_id));
  [...(itemsRes.data ?? []), ...(vendorsRecentRes.data ?? []), ...decisions, ...(docsRes.data ?? [])].forEach((row: any) => row.created_by && ids.add(row.created_by));
  recommendations.forEach((rec: any) => rec.suggested_owner_id && ids.add(rec.suggested_owner_id));
  const usersRes = ids.size ? await db.from('users').select('id, name, display_name, avatar_url').in('id', [...ids]) : { data: [] as any[] };
  const userMap = new Map((usersRes.data ?? []).map((user: any) => [user.id, user]));
  const members = (membersRes.data ?? []).map((member: any) => ({ role: member.role, user: userMap.get(member.user_id) }));

  // Ripple feed (P5): recent changes and the areas they touched.
  const ripplesRes = await db
    .from('ripple_events')
    .select('id, source_type, change_kind, summary, impact_json, created_at')
    .eq('workspace_id', workspace.id)
    .order('created_at', { ascending: false })
    .limit(8);
  const ripples = (ripplesRes.data ?? []) as RippleRow[];

  const unresolvedDecisions = decisions.filter((decision: any) => !['approved', 'deferred', 'rejected'].includes(decision.status));
  const coreVendors = ['venue', 'caterer', 'photographer', 'officiant', 'florist'];
  const vendorReady = new Set(['selected', 'booked', 'paid_deposit', 'fully_paid']);
  const missingVendors = coreVendors.filter((category) => !vendors.some((vendor: any) => vendor.category === category && vendorReady.has(vendor.status)));
  const committed = budgetItems.reduce((sum: number, item: any) => sum + Number(item.committed_cost ?? item.quoted_cost ?? item.estimated_cost ?? 0), 0);
  const paid = budgetItems.reduce((sum: number, item: any) => sum + Number(item.paid_amount ?? 0), 0);
  const unknownBudgetItems = budgetItems.filter((item: any) => item.estimated_cost == null && item.quoted_cost == null && item.committed_cost == null);
  const unknownBudgetCats = budgetCats.filter((cat: any) => cat.planned_amount == null);
  const acceptedGuests = guests.filter((guest: any) => guest.rsvp_status === 'accepted');
  const travelingGuests = guests.filter((guest: any) => guest.traveling_from);

  const severeRisks = risks.filter((risk: any) => ['high', 'critical'].includes(String(risk.severity ?? '').toLowerCase()));
  const missingBudget = !profile?.budget_total;
  const missingGuestCount = !profile?.guest_estimate && !profile?.guest_max;
  const score = severeRisks.length || risks.length >= 6
    ? 'At risk'
    : risks.length >= 3 || unresolvedDecisions.length >= 5
      ? 'Needs attention'
      : risks.length || missingBudget || missingGuestCount || missingVendors.length
        ? 'A little to tend'
        : 'Peaceful';

  const nextActions = recommendations.map((rec: any) => {
    const mod = moduleFor(rec.linked_entity_type || rec.recommendation_type);
    return {
      key: rec.id as string,
      recId: rec.id as string | undefined,
      citations: (rec.citations_json ?? []) as Citation[],
      source: (rec.source ?? 'ai') as string,
      title: rec.title,
      reason: rec.reason || rec.description || 'Recommended by the Peace Engine.',
      module: mod.label,
      href: mod.href,
      owner: rec.suggested_owner_id ? nameOf(userMap.get(rec.suggested_owner_id)) : 'Best owner',
      due: rec.suggested_due_date,
      priority: rec.priority,
    };
  });

  function addFallback(key: string, title: string, reason: string, type: string) {
    if (nextActions.length >= 5 || nextActions.some((action) => action.key === key || action.title === title)) return;
    const mod = moduleFor(type);
    // Fallbacks are heuristic (not real recommendation rows) → no recId, no state controls.
    nextActions.push({ key, recId: undefined, citations: [], source: 'ai', title, reason, module: mod.label, href: mod.href, owner: 'You two', due: null, priority: 'med' });
  }

  if (dreamStatus(dream, !!compass?.summary) !== 'Compass ready') {
    addFallback('dream', 'Complete the Dream', 'The Compass powers decision guidance, vendor priorities, budget guidance, guest rules, and timeline suggestions.', 'dream');
  }
  if (!missingGuestCount) {
    addFallback('guest-rules', 'Review guest count impact', 'Guest count affects venue, catering, seating, invitations, budget, travel, and timeline.', 'guest');
  } else {
    addFallback('guest-count', 'Set a guest count range', 'The engine cannot estimate venue, catering, seating, and budget pressure without a guest range.', 'guest');
  }
  if (missingBudget) addFallback('budget', 'Set the Money Map ceiling', 'Money Map guidance depends on knowing what is firm, flexible, or still unknown.', 'budget');
  if (missingVendors.length) addFallback('vendors', `Shortlist ${missingVendors[0].replace(/_/g, ' ')}`, 'Core vendor gaps affect timeline, deposits, documents, and decision order.', 'vendor');
  if (unresolvedDecisions.length) addFallback('decision', `Resolve ${unresolvedDecisions[0].title}`, 'Open decisions create downstream dependencies across vendors, budget, guests, and timeline.', 'decision');

  const riskGroups = new Map<string, { title: string; description?: string | null; severity?: string | null; count: number; resolution?: string | null }>();
  risks.forEach((risk: any) => {
    const key = risk.risk_type || risk.title;
    const existing = riskGroups.get(key);
    if (existing) existing.count += 1;
    else riskGroups.set(key, { title: risk.title, description: risk.description, severity: risk.severity, resolution: risk.suggested_resolution, count: 1 });
  });

  const activity = [
    ...(itemsRes.data ?? []).map((row: any) => ({ kind: 'added to the board', what: row.title || 'a fragment', at: row.created_at, by: row.created_by })),
    ...(vendorsRecentRes.data ?? []).map((row: any) => ({ kind: 'updated a vendor', what: row.name, at: row.created_at, by: row.created_by })),
    ...decisions.map((row: any) => ({ kind: 'opened a decision', what: row.title, at: row.created_at, by: row.created_by })),
    ...(docsRes.data ?? []).map((row: any) => ({ kind: 'uploaded a document', what: row.title, at: row.created_at, by: row.created_by })),
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()).slice(0, 6);

  return (
    <div className="relative mx-auto max-w-6xl">
      <span className="dream-twinkle" style={{ left: '2%', top: 0, fontSize: 13 }}>+</span>
      <span className="dream-twinkle" style={{ left: '96%', top: 18, fontSize: 16, animationDelay: '1s' }}>+</span>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">Living command center</p>
          <h1 className="voice text-4xl">{workspace.name}</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {members.slice(0, 5).map((member, index) => (
              <span key={index} className="rounded-full ring-2 ring-[var(--cream)]"><Avatar name={nameOf(member.user)} url={member.user?.avatar_url} /></span>
            ))}
          </div>
          <InviteCircle />
          {can(workspace.role, 'plan.full') && (
            <form action={runPeaceEngineAction}>
              <button className="rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white hover:opacity-90">Ask the Peacekeeper</button>
            </form>
          )}
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_0.8fr]">
        <section className="rounded-[16px] border border-[var(--line)] bg-[var(--pearl)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">Wedding Compass Summary</p>
            <Link href="/dream" className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]">Open Dream</Link>
          </div>
          <p className="voice mt-2 max-w-3xl text-2xl leading-snug text-[var(--ink)]">
            {compass?.summary || 'Your north star will appear here once your Dream is set.'}
          </p>
          {compass?.tone && <p className="mt-2 text-sm text-[var(--ink-soft)]">{compass.tone}</p>}
        </section>

        <section className="rounded-[16px] border border-[var(--line)] bg-[var(--pearl)] p-5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">Peace Score</p>
            <ScoreCard label={score} />
          </div>
          <dl className="mt-4 grid gap-3 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-[var(--ink-soft)]">Dream status</dt><dd>{dreamStatus(dream, !!compass?.summary)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--ink-soft)]">Planning stage</dt><dd>{label(profile?.planning_stage)}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--ink-soft)]">Open decisions</dt><dd>{unresolvedDecisions.length}</dd></div>
            <div className="flex justify-between gap-3"><dt className="text-[var(--ink-soft)]">Open risks</dt><dd>{risks.length}</dd></div>
          </dl>
        </section>
      </div>

      <section className="mt-7">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">Peace Engine</p>
            <h2 className="voice text-2xl">Next Best Actions</h2>
          </div>
          <span className="text-xs text-[var(--ink-faint)]">3 to 5 moves that reduce uncertainty</span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {nextActions.slice(0, 5).map((action) => (
            <article key={action.key} className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-sm font-medium text-[var(--ink)]">{action.title}</h3>
                <span className="rounded-full bg-[var(--gold-bg)] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[var(--gold)]">{action.priority}</span>
              </div>
              <p className="mt-2 text-xs leading-5 text-[var(--ink-soft)]">{action.reason}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-[var(--ink-faint)]">
                <span>{action.module}</span>
                <span>{action.owner}</span>
                {action.due && <span>Due {action.due}</span>}
              </div>
              {action.recId ? (
                <>
                  <InsightActions recId={action.recId} citations={action.citations} source={action.source} />
                  <Link href={action.href} className="mt-2 inline-flex text-xs text-[var(--clay-ink)] underline underline-offset-2">Open {action.module}</Link>
                </>
              ) : (
                <Link href={action.href} className="mt-3 inline-flex rounded-full bg-[var(--clay)] px-3 py-1.5 text-xs text-white">Open</Link>
              )}
            </article>
          ))}
        </div>
      </section>

      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="voice text-xl">Decision Queue</h2>
          {unresolvedDecisions.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">No unresolved decisions. A rare and lovely thing.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {unresolvedDecisions.slice(0, 5).map((decision: any) => (
                <li key={decision.id} className="rounded-[12px] border border-[var(--line)] bg-[var(--pearl)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--ink)]">{decision.title}</span>
                    <span className="rounded-full bg-[var(--cream)] px-2 py-0.5 text-[11px] text-[var(--ink-soft)]">{label(decision.status)}</span>
                  </div>
                  <p className="mt-1 text-[11px] text-[var(--ink-faint)]">{label(decision.category)}{decision.due_date ? ` by ${decision.due_date}` : ''}</p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="voice text-xl">Risk Radar</h2>
          {[...riskGroups.values()].length === 0 ? (
            <p className="mt-3 text-sm text-[var(--ink-soft)]">All calm. Nothing needs you right now.</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {[...riskGroups.values()].slice(0, 5).map((risk) => (
                <li key={risk.title} className="rounded-[12px] border border-[var(--line)] bg-[var(--pearl)] p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm text-[var(--ink)]">{risk.title}</span>
                    <span className="rounded-full bg-[var(--clay-bg)] px-2 py-0.5 text-[11px] text-[var(--clay-ink)]">{risk.count > 1 ? `${risk.count} linked` : label(risk.severity)}</span>
                  </div>
                  {risk.description && <p className="mt-1 text-xs text-[var(--ink-soft)]">{risk.description}</p>}
                  {risk.resolution && <p className="mt-1 text-[11px] text-[var(--ink-faint)]">{risk.resolution}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="mt-7 grid gap-4 lg:grid-cols-3">
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <h2 className="voice text-xl">Vendor Gaps</h2>
          <p className="mt-2 text-sm text-[var(--ink-soft)]">
            {missingVendors.length ? `Still needed: ${missingVendors.map((item) => item.replace(/_/g, ' ')).join(', ')}.` : 'Core vendors are selected or booked.'}
          </p>
        </section>
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <h2 className="voice text-xl">Money Map Pressure</h2>
          <dl className="mt-2 grid gap-1 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--ink-soft)]">Budget</dt><dd>{money(profile?.budget_total)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--ink-soft)]">Committed/estimated</dt><dd>{money(committed)}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--ink-soft)]">Paid</dt><dd>{money(paid)}</dd></div>
          </dl>
          <p className="mt-2 text-[11px] text-[var(--ink-faint)]">
            Largest unknowns: {[...unknownBudgetItems.map((item: any) => item.title), ...unknownBudgetCats.map((cat: any) => cat.name)].slice(0, 3).join(', ') || 'none yet'}
          </p>
        </section>
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
          <h2 className="voice text-xl">Guest Count Impact</h2>
          <dl className="mt-2 grid gap-1 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--ink-soft)]">Range</dt><dd>{profile?.guest_estimate || profile?.guest_max ? `${profile?.guest_estimate ?? '?'}-${profile?.guest_max ?? '?'}` : 'Missing'}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--ink-soft)]">Accepted</dt><dd>{acceptedGuests.length}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--ink-soft)]">Traveling</dt><dd>{travelingGuests.length}</dd></div>
          </dl>
          <p className="mt-2 text-[11px] text-[var(--ink-faint)]">Affects venue, food, seating, invitations, budget, travel, and timeline.</p>
        </section>
      </div>

      <section className="mt-7">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">Ripple layer</p>
            <h2 className="voice text-xl">Ripples</h2>
          </div>
          <span className="text-xs text-[var(--ink-faint)]">Recent changes and what they touched</span>
        </div>
        <RippleFeed ripples={ripples} />
      </section>

      <section className="mt-7">
        <h2 className="voice text-xl">Recent Activity</h2>
        {activity.length === 0 ? (
          <p className="mt-3 text-sm text-[var(--ink-soft)]">Once your circle starts planning, changes will appear here.</p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {activity.map((item, index) => {
              const who = nameOf(userMap.get(item.by));
              return (
                <li key={index} className="flex items-center gap-2.5 text-sm">
                  <Avatar name={who} url={userMap.get(item.by)?.avatar_url} size={24} />
                  <span className="text-[var(--ink)]"><b className="font-medium">{who}</b> {item.kind} <span className="text-[var(--ink-soft)]">- {item.what}</span></span>
                  <span className="ml-auto shrink-0 text-[11px] text-[var(--ink-faint)]">{timeAgo(item.at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
