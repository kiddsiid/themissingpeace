import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createTask, deleteTask, updateTaskStatus, createTimelineEvent, deleteTimelineEvent, createMilestone, deleteMilestone, createDependency, deleteDependency } from '@/app/(app)/planning/actions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';

const TASK_STATUS = ['not_started','in_progress','waiting','needs_decision','done','skipped'];
const TASK_CATEGORIES = ['budget','venue','vendor','guest','design','attire','food','legal','travel','beauty','ceremony','reception','honeymoon','post_wedding'];

function label(value?: string | null) {
  return value ? value.replace(/_/g, ' ') : 'not set';
}

function ModeLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={'rounded-full px-3 py-1 text-xs ' + (active ? 'bg-[var(--clay-bg)] text-[var(--clay-ink)]' : 'border border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]')}>
      {children}
    </Link>
  );
}

export default async function TimelinePage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) {
  const ws = await getActiveWorkspace();
  if (!ws) redirect('/onboarding');
  const mode = (await searchParams)?.mode === 'day' ? 'day' : 'roadmap';
  const db = supabaseAdmin();
  const [tasksRes, eventsRes, decisionsRes, milestonesRes, depsRes, profileRes, vendorsRes, guestsRes, rippleRes] = await Promise.all([
    db.from('tasks').select('id, title, category, status, due_date, priority, linked_decision_id').eq('workspace_id', ws.id).order('due_date', { ascending: true }),
    db.from('events').select('id, title, date, time, location, kind, notes').eq('workspace_id', ws.id).order('date', { ascending: true }),
    db.from('decisions').select('id, title, status').eq('workspace_id', ws.id),
    db.from('milestones').select('id, title, target_date').eq('workspace_id', ws.id).order('target_date', { ascending: true }),
    db.from('planning_dependencies').select('id, source_entity_id, depends_on_entity_id, dependency_reason').eq('workspace_id', ws.id),
    db.from('wedding_profiles').select('wedding_date, date_range_start, guest_estimate').eq('workspace_id', ws.id).maybeSingle(),
    db.from('vendors').select('id, name, category, status').eq('workspace_id', ws.id),
    db.from('guests').select('id', { count: 'exact', head: true }).eq('workspace_id', ws.id).neq('rsvp_status', 'declined'),
    db.from('ripple_events').select('summary, source_type, created_at').eq('workspace_id', ws.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const tasks = tasksRes.data ?? [];
  const events = eventsRes.data ?? [];
  const decisions = decisionsRes.data ?? [];
  const milestones = milestonesRes.data ?? [];
  const dependencies = depsRes.data ?? [];
  const taskTitle = new Map(tasks.map((task: any) => [task.id, task.title]));
  const openDecisions = decisions.filter((decision: any) => !['approved', 'deferred', 'rejected'].includes(decision.status));
  const blockedTasks = tasks.filter((task: any) => task.status === 'needs_decision' || task.linked_decision_id);
  const profile = profileRes.data;
  const vendorList = vendorsRes.data ?? [];
  const anchorDate = profile?.wedding_date || profile?.date_range_start;
  const derivedDependencies = [
    openDecisions[0] ? `Decision ledger → resolve “${openDecisions[0].title}” before dependent work moves.` : null,
    (guestsRes.count ?? profile?.guest_estimate) ? `Guests → ${guestsRes.count ?? profile?.guest_estimate} people drive catering, stationery, and seating timing.` : null,
    vendorList.some((vendor: any) => vendor.status === 'booked') ? `Vendors → ${vendorList.filter((vendor: any) => vendor.status === 'booked').length} booked teams contribute handoffs and arrival windows.` : null,
    anchorDate ? `Wedding profile → ${anchorDate} anchors every relative deadline.` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">The road and the day itself</p>
        <h1 className="voice text-4xl">Timeline</h1>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">Planning Roadmap tracks tasks and dependencies. Run of Day keeps the wedding day sequence clear.</p>
      </div>

      <div className="mt-5 flex justify-center gap-2">
        <ModeLink href="/timeline" active={mode === 'roadmap'}>Planning Roadmap</ModeLink>
        <ModeLink href="/timeline?mode=day" active={mode === 'day'}>Run of Day</ModeLink>
      </div>

      <section className="mt-5 rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[var(--gold)]">Connected advisory</p>
            <h2 className="voice mt-1 text-2xl">Dependencies recomputed from the live plan</h2>
          </div>
          {rippleRes.data && <p className="max-w-sm text-right text-xs leading-5 text-[var(--ink-soft)]">Latest driver · {rippleRes.data.summary}</p>}
        </div>
        {derivedDependencies.length ? (
          <ul className="mt-3 grid gap-2 md:grid-cols-2">
            {derivedDependencies.map((dependency) => <li key={dependency} className="rounded-[10px] bg-[var(--cream)] px-3 py-2 text-xs leading-5 text-[var(--ink-soft)]">{dependency}</li>)}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-[var(--ink-faint)]">Add the date, guests, vendors, or a decision to reveal connected dependencies.</p>
        )}
      </section>

      {mode === 'roadmap' ? (
        <div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">What is missing?</p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">{tasks.length ? `${tasks.filter((task: any) => task.status !== 'done').length} tasks still open.` : 'No roadmap tasks yet.'}</p>
            </section>
            <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Dependencies</p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">{blockedTasks.length ? `${blockedTasks.length} tasks depend on decisions.` : 'No decision blockers marked yet.'}</p>
            </section>
            <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Next best action</p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">{openDecisions[0] ? `Resolve "${openDecisions[0].title}" before downstream tasks move.` : 'Add the next deadline or milestone.'}</p>
            </section>
          </div>

          <form action={createTask} className="mt-5 grid gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4 md:grid-cols-[1.4fr_0.8fr_0.7fr_0.7fr_auto]">
            <input name="title" required placeholder="Task, milestone, or dependency" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
            <select name="category" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm">{TASK_CATEGORIES.map((category) => <option key={category} value={category}>{label(category)}</option>)}</select>
            <input type="date" name="due_date" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
            <select name="priority" defaultValue="med" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm"><option value="low">low</option><option value="med">med</option><option value="high">high</option></select>
            <button className="rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white">Add</button>
          </form>

          {tasks.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--ink-faint)]">No roadmap yet. Add the first task above.</p>
          ) : (
            <ul className="mt-5 space-y-2">
              {tasks.map((task: any) => (
                <li key={task.id} className="flex flex-wrap items-center gap-2 rounded-[12px] border border-[var(--line)] bg-[var(--pearl)] p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{task.title}</p>
                    <p className="text-[11px] text-[var(--ink-faint)]">{task.due_date ? `by ${task.due_date}` : 'no date'} - {label(task.category)} - {task.priority}</p>
                  </div>
                  <form action={updateTaskStatus} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={task.id} />
                    <select name="status" defaultValue={task.status} className="rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs">{TASK_STATUS.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select>
                    <button className="rounded-full bg-[var(--gold-bg)] px-2.5 py-1.5 text-xs text-[var(--gold)]">save</button>
                  </form>
                  <form action={deleteTask}><input type="hidden" name="id" value={task.id} /><button className="px-1 text-[var(--ink-faint)] hover:text-[var(--clay-ink)]" aria-label="Remove">Remove</button></form>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-6">
            <h2 className="voice text-xl">Milestones</h2>
            <form action={createMilestone} className="mt-2 flex flex-wrap gap-2">
              <input name="title" required placeholder="Milestone (e.g. Save the dates sent)" className="min-w-[200px] flex-1 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
              <input type="date" name="target_date" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
              <button className="rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white">Add</button>
            </form>
            {milestones.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {milestones.map((m: any) => (
                  <li key={m.id} className="flex items-center gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--pearl)] p-2.5">
                    <span className="w-24 shrink-0 text-xs text-[var(--gold)]">{m.target_date || 'no date'}</span>
                    <span className="min-w-0 flex-1 truncate text-sm">{m.title}</span>
                    <form action={deleteMilestone}><input type="hidden" name="id" value={m.id} /><button className="px-1 text-[var(--ink-faint)] hover:text-[var(--clay-ink)]" aria-label="Remove">Remove</button></form>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-6">
            <h2 className="voice text-xl">Dependencies</h2>
            <p className="text-[11px] text-[var(--ink-faint)]">e.g. catering quote depends on guest count range</p>
            {tasks.length >= 2 ? (
              <form action={createDependency} className="mt-2 flex flex-wrap items-center gap-2">
                <select name="source_task_id" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm">{tasks.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
                <span className="text-xs text-[var(--ink-soft)]">depends on</span>
                <select name="depends_on_task_id" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm">{tasks.map((t: any) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
                <input name="reason" placeholder="why (optional)" className="min-w-[120px] flex-1 rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
                <button className="rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white">Link</button>
              </form>
            ) : (
              <p className="mt-2 text-sm text-[var(--ink-faint)]">Add two tasks to link a dependency.</p>
            )}
            {dependencies.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {dependencies.map((dep: any) => (
                  <li key={dep.id} className="flex items-center gap-2 rounded-[12px] border border-[var(--line)] bg-[var(--pearl)] p-2.5 text-sm">
                    <span className="min-w-0 flex-1"><b className="font-medium">{taskTitle.get(dep.source_entity_id) || 'A task'}</b> depends on <b className="font-medium">{taskTitle.get(dep.depends_on_entity_id) || 'another'}</b>{dep.dependency_reason ? <span className="text-[var(--ink-faint)]"> — {dep.dependency_reason}</span> : ''}</span>
                    <form action={deleteDependency}><input type="hidden" name="id" value={dep.id} /><button className="px-1 text-[var(--ink-faint)] hover:text-[var(--clay-ink)]" aria-label="Remove">Remove</button></form>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">What is missing?</p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">{events.length ? `${events.length} moments scheduled.` : 'No wedding day schedule yet.'}</p>
            </section>
            <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">What does this affect?</p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">Vendor arrival, ceremony, reception, photos, meals, speeches, music, send off, and breakdown.</p>
            </section>
            <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
              <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Next best action</p>
              <p className="mt-2 text-sm text-[var(--ink-soft)]">Add ceremony time first, then build photos, meals, speeches, and vendor arrival around it.</p>
            </section>
          </div>

          <form action={createTimelineEvent} className="mt-5 grid gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4 md:grid-cols-[1fr_0.7fr_0.5fr_0.8fr_auto]">
            <input type="hidden" name="kind" value="run_of_show" />
            <input name="title" required placeholder="Moment, vendor arrival, speech, music cue" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
            <input type="date" name="date" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
            <input name="time" placeholder="time" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm" />
            <input name="location" placeholder="where" className="rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
            <button className="rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white">Add</button>
          </form>

          {events.length === 0 ? (
            <p className="mt-6 text-sm text-[var(--ink-faint)]">No Run of Day yet.</p>
          ) : (
            <ul className="mt-5 space-y-2">
              {events.map((event: any) => (
                <li key={event.id} className="flex items-center gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--pearl)] p-3">
                  <span className="w-20 shrink-0 text-sm text-[var(--gold)]">{event.time || event.date || '--'}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm">{event.title}</p>
                    <p className="text-[11px] text-[var(--ink-faint)]">{[event.location, label(event.kind)].filter(Boolean).join(' - ')}</p>
                  </div>
                  <form action={deleteTimelineEvent}><input type="hidden" name="id" value={event.id} /><button className="px-1 text-[var(--ink-faint)] hover:text-[var(--clay-ink)]" aria-label="Remove">Remove</button></form>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
