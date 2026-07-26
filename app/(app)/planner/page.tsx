import Link from 'next/link';
import { redirect } from 'next/navigation';
import { switchPlannerWorkspace } from '@/app/(app)/planner/actions';
import { Chip } from '@/design-system';
import { ensureAppUser, getSessionUser } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';

function readiness(profile: any, compass: any) {
  const checks = [
    !!compass?.summary,
    !!(profile?.wedding_date || profile?.date_range_start),
    Number(profile?.guest_estimate || 0) > 0,
    Number(profile?.budget_total || 0) > 0,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default async function PlannerHomePage() {
  const authUser = await getSessionUser();
  if (!authUser) redirect('/login');
  const userId = await ensureAppUser(authUser);
  const active = await getActiveWorkspace();
  const db = supabaseAdmin();
  const { data: memberships } = await db
    .from('workspace_members')
    .select('workspace_id, role, created_at')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true });
  const ids = (memberships ?? []).map((membership: any) => membership.workspace_id);

  const [workspacesRes, profilesRes, compassesRes, decisionsRes, tasksRes] = ids.length
    ? await Promise.all([
        db.from('workspaces').select('id, name').in('id', ids),
        db.from('wedding_profiles').select('workspace_id, partner_one_label, partner_two_label, wedding_date, date_range_start, guest_estimate, budget_total').in('workspace_id', ids),
        db.from('wedding_compass').select('workspace_id, summary, tone, priorities_json, version').in('workspace_id', ids),
        db.from('decisions').select('workspace_id, id, title, status').in('workspace_id', ids),
        db.from('tasks').select('workspace_id, id, title, status, due_date').in('workspace_id', ids),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }, { data: [] }, { data: [] }];

  const workspaces = new Map((workspacesRes.data ?? []).map((item: any) => [item.id, item]));
  const profiles = new Map((profilesRes.data ?? []).map((item: any) => [item.workspace_id, item]));
  const compasses = new Map((compassesRes.data ?? []).map((item: any) => [item.workspace_id, item]));
  const roleByWorkspace = new Map((memberships ?? []).map((item: any) => [item.workspace_id, item.role]));
  const cards = ids.map((id) => {
    const workspace = workspaces.get(id);
    const profile = profiles.get(id);
    const compass = compasses.get(id);
    const openDecisions = (decisionsRes.data ?? []).filter((item: any) => item.workspace_id === id && !['approved', 'deferred', 'rejected'].includes(item.status));
    const openTasks = (tasksRes.data ?? []).filter((item: any) => item.workspace_id === id && !['done', 'skipped'].includes(item.status));
    const next = !compass
      ? { label: 'Capture their Compass', href: '/dream' }
      : openDecisions[0]
        ? { label: `Resolve ${openDecisions[0].title}`, href: '/decisions' }
        : openTasks[0]
          ? { label: `Move ${openTasks[0].title}`, href: '/timeline' }
          : { label: 'Review Peace Center', href: '/peace-center' };
    return {
      id,
      name: workspace?.name || `${profile?.partner_one_label || 'Partner One'} & ${profile?.partner_two_label || 'Partner Two'}`,
      role: roleByWorkspace.get(id) || 'viewer',
      profile,
      compass,
      openDecisions: openDecisions.length,
      openTasks: openTasks.length,
      score: readiness(profile, compass),
      next,
    };
  });

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--gold)]">Planner home</p>
          <h1 className="voice mt-1 text-4xl">Every couple, held in their own Compass.</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">
            Switch planning worlds without mixing them. Each card carries that couple&apos;s feeling, readiness, and next peaceful action.
          </p>
        </div>
        <Link href="/planner/walk" className="rounded-full bg-[var(--clay)] px-5 py-2.5 text-sm text-white">
          + Begin with a couple
        </Link>
      </div>

      {cards.length === 0 ? (
        <section className="mt-8 rounded-[18px] border border-[var(--line)] bg-[var(--pearl)] p-8 text-center">
          <h2 className="voice text-2xl">Your first couple begins with listening.</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-[var(--ink-soft)]">Take the Planner Walk to capture their feeling and create a Compass-led planning world.</p>
          <Link href="/planner/walk" className="mt-5 inline-block rounded-full bg-[var(--clay)] px-5 py-2 text-sm text-white">Take the Planner Walk</Link>
        </section>
      ) : (
        <div className="mt-7 grid gap-4 lg:grid-cols-2">
          {cards.map((card) => (
            <article key={card.id} className={'rounded-[18px] border bg-[var(--pearl)] p-5 ' + (active?.id === card.id ? 'border-[var(--gold)] shadow-sm' : 'border-[var(--line)]')}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="voice text-2xl">{card.name}</h2>
                    {active?.id === card.id && <Chip tone="sage">Open now</Chip>}
                  </div>
                  <p className="mt-1 text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">{String(card.role).replace(/_/g, ' ')} access</p>
                </div>
                <div className="text-right">
                  <p className="voice text-2xl text-[var(--clay-ink)]">{card.score}%</p>
                  <p className="text-[10px] uppercase tracking-wide text-[var(--ink-faint)]">ready</p>
                </div>
              </div>

              <section className="mt-4 rounded-[14px] bg-[var(--cream)] p-4">
                <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--gold)]">Wedding Compass · v{card.compass?.version ?? 0}</p>
                <p className="voice mt-2 text-xl leading-7 text-[var(--ink)]">{card.compass?.tone || 'The couple’s feeling is waiting to be captured.'}</p>
                <p className="mt-2 line-clamp-3 text-xs leading-5 text-[var(--ink-soft)]">{card.compass?.summary || 'Begin with their words before creating tasks, budgets, or visual direction.'}</p>
              </section>

              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-[10px] border border-[var(--line)] p-2"><p className="text-lg">{card.profile?.guest_estimate ?? '—'}</p><p className="text-[9px] uppercase text-[var(--ink-faint)]">guests</p></div>
                <div className="rounded-[10px] border border-[var(--line)] p-2"><p className="text-lg">{card.openDecisions}</p><p className="text-[9px] uppercase text-[var(--ink-faint)]">decisions</p></div>
                <div className="rounded-[10px] border border-[var(--line)] p-2"><p className="text-lg">{card.openTasks}</p><p className="text-[9px] uppercase text-[var(--ink-faint)]">open tasks</p></div>
              </div>

              <form action={switchPlannerWorkspace} className="mt-4 flex items-center justify-between gap-3">
                <input type="hidden" name="workspace_id" value={card.id} />
                <input type="hidden" name="next" value={card.next.href} />
                <p className="min-w-0 truncate text-xs text-[var(--ink-soft)]">Next · {card.next.label}</p>
                <button className="shrink-0 rounded-full bg-[var(--ink)] px-4 py-2 text-sm text-white">
                  {active?.id === card.id ? 'Continue' : 'Open wedding'}
                </button>
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
