import { redirect } from 'next/navigation';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';
import {
  createDecision, deleteDecision,
  addDecisionOption, voteDecisionOption,
} from '@/app/(app)/planning/actions';
import type { DreamResponses } from '@/lib/engine/compass';
import { DREAM_CLOUDS } from '@/lib/engine/dream-clouds';
import { DecisionSettleForm } from '@/components/decisions/DecisionSettleForm';
import { ObjectComments } from '@/components/collaboration/ObjectComments';
import { ObjectPresence } from '@/components/collaboration/ObjectPresence';

const CATEGORIES = ['venue', 'guest', 'budget', 'design', 'attire', 'menu', 'vendor', 'timeline', 'family', 'cultural_religious', 'honeymoon'];
const STATUSES = ['open', 'discussing', 'needs_vote', 'needs_planner_input', 'approved', 'deferred', 'rejected', 'changed'];
const label = (v?: string | null) => (v ? v.replace(/_/g, ' ') : '');

export default async function DecisionsPage() {
  const ws = await getActiveWorkspace();
  if (!ws) redirect('/onboarding');
  const db = supabaseAdmin();

  const [decisionsRes, dreamRes] = await Promise.all([
    db.from('decisions').select('id, title, description, category, status, due_date, final_choice, rationale, linked_dream_value, linked_dream_ids, affected_objects_json, version, created_at').eq('workspace_id', ws.id).order('created_at', { ascending: false }),
    db.from('dreams').select('responses_json').eq('workspace_id', ws.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const decisions = decisionsRes.data ?? [];
  const ids = decisions.map((d: any) => d.id);
  const [optionsRes, votesRes, commentsRes, historyRes] = ids.length
    ? await Promise.all([
        db.from('decision_options').select('id, decision_id, label, detail, sort').in('decision_id', ids).order('sort'),
        db.from('decision_votes').select('decision_id, option_id, user_id').in('decision_id', ids),
        db.from('object_comments').select('id, object_id, body, author_id, created_at').eq('workspace_id', ws.id).eq('object_type', 'decision').in('object_id', ids).order('created_at'),
        db.from('audit_events').select('id, entity_id, action, actor_id, meta, created_at').eq('workspace_id', ws.id).eq('entity_type', 'decision').in('entity_id', ids).order('created_at', { ascending: false }),
      ])
    : [{ data: [] as any[] }, { data: [] as any[] }, { data: [] as any[] }, { data: [] as any[] }];
  const options = optionsRes.data ?? [];
  const votes = votesRes.data ?? [];
  const comments = commentsRes.data ?? [];
  const history = historyRes.data ?? [];
  const authorIds = [...new Set([
    ...comments.map((comment: any) => comment.author_id),
    ...history.map((event: any) => event.actor_id),
  ].filter(Boolean))];
  const { data: commentAuthors } = authorIds.length
    ? await db.from('users').select('id, name, display_name').in('id', authorIds)
    : { data: [] as any[] };
  const authorMap = new Map((commentAuthors ?? []).map((user: any) => [user.id, user.display_name || user.name]));

  const dream = (dreamRes.data?.responses_json ?? {}) as DreamResponses;
  const dreamValues = [...(dream.priorities ?? []), ...(dream.nonNegotiables ?? [])].slice(0, 8).map((value) => ({
    id: DREAM_CLOUDS.find((cloud) => cloud.label.toLowerCase() === value.toLowerCase())?.id
      || value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
    label: value,
  }));

  const optionsOf = (id: string) => options.filter((o: any) => o.decision_id === id);
  const voteCount = (optionId: string) => votes.filter((v: any) => v.option_id === optionId).length;
  const myVote = (decisionId: string) => votes.find((v: any) => v.decision_id === decisionId && v.user_id === ws.userId)?.option_id as string | undefined;
  const unresolved = decisions.filter((d: any) => !['approved', 'rejected', 'deferred'].includes(d.status));

  return (
    <div className="mx-auto max-w-3xl">
      <div className="text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">Turning maybes into vows-to-the-plan</p>
        <h1 className="voice text-4xl">Decisions</h1>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">Weigh options together, vote, and set the final choice with a reason — tied back to your Dream.</p>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4"><p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">What needs deciding?</p><p className="mt-2 text-sm text-[var(--ink-soft)]">{unresolved.length} open decision{unresolved.length === 1 ? '' : 's'}.</p></section>
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4"><p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">What does this affect?</p><p className="mt-2 text-sm text-[var(--ink-soft)]">Open decisions ripple into vendors, budget, guests, and timeline.</p></section>
        <section className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4"><p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Next best action</p><p className="mt-2 text-sm text-[var(--ink-soft)]">Add options to the biggest open decision, then vote.</p></section>
      </div>

      <form action={createDecision} className="mt-5 flex flex-wrap items-end gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-3">
        <input type="hidden" name="workspaceId" value={ws.id} />
        <input name="title" required placeholder="What needs deciding?" className="min-w-[180px] flex-1 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm" />
        <select name="category" className="rounded-full border border-[var(--line)] bg-white px-3 py-2 text-sm">{CATEGORIES.map((c) => <option key={c} value={c}>{label(c)}</option>)}</select>
        <button className="rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white">Add</button>
      </form>

      <div className="mt-5 space-y-4">
        {decisions.length === 0 && <p className="text-sm text-[var(--ink-faint)]">Nothing open. When something feels unresolved, name it here.</p>}
        {decisions.map((d: any) => {
          const opts = optionsOf(d.id);
          const mine = myVote(d.id);
          const resolved = ['approved', 'rejected', 'deferred'].includes(d.status);
          const affected = Array.isArray(d.affected_objects_json) ? d.affected_objects_json : [];
          const decisionComments = comments
            .filter((comment: any) => comment.object_id === d.id)
            .map((comment: any) => ({ ...comment, author_name: authorMap.get(comment.author_id) }));
          const decisionHistory = history.filter((event: any) => event.entity_id === d.id).slice(0, 8);
          return (
            <details key={d.id} className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4" open={!resolved}>
              <summary className="flex cursor-pointer items-center justify-between gap-3">
                <span className="voice text-lg">{d.title}</span>
                <span className={'shrink-0 rounded-full px-2 py-0.5 text-[11px] ' + (d.status === 'approved' ? 'bg-[var(--sage-bg)] text-[#566049]' : 'bg-[var(--cream)] text-[var(--ink-soft)]')}>{label(d.status)}</span>
              </summary>

              <p className="mt-1 text-[11px] text-[var(--ink-faint)]">{label(d.category)}{d.due_date ? ` · by ${d.due_date}` : ''}{d.linked_dream_value ? ` · Dream: ${d.linked_dream_value}` : ''}</p>
              <div className="mt-1">
                <ObjectPresence objectType="decision" objectId={d.id} enabled={!!process.env.LIVEBLOCKS_SECRET_KEY} />
              </div>

              {/* Options + voting */}
              <div className="mt-3 space-y-1.5">
                {opts.length === 0 && <p className="text-[12px] text-[var(--ink-faint)]">No options yet — add a couple to compare.</p>}
                {opts.map((o: any) => (
                  <div key={o.id} className={'flex items-center gap-2 rounded-[10px] border px-3 py-1.5 ' + (mine === o.id ? 'border-[var(--clay)] bg-[var(--clay-bg)]' : 'border-[var(--line)]')}>
                    <span className="min-w-0 flex-1 truncate text-sm">{o.label}{o.detail ? <span className="text-[var(--ink-faint)]"> — {o.detail}</span> : ''}</span>
                    <span className="text-[11px] text-[var(--ink-faint)]">{voteCount(o.id)} ♥</span>
                    <form action={voteDecisionOption}>
                      <input type="hidden" name="decision_id" value={d.id} /><input type="hidden" name="option_id" value={o.id} />
                      <button className="rounded-full bg-[var(--gold-bg)] px-2 py-0.5 text-[11px] text-[var(--gold)]">{mine === o.id ? 'your vote' : 'vote'}</button>
                    </form>
                  </div>
                ))}
              </div>

              <form action={addDecisionOption} className="mt-2 flex gap-2">
                <input type="hidden" name="decision_id" value={d.id} />
                <input name="label" required placeholder="Add an option" className="flex-1 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs" />
                <input name="detail" placeholder="detail (optional)" className="flex-1 rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-xs" />
                <button className="rounded-full border border-[var(--line)] px-3 py-1.5 text-xs text-[var(--ink-soft)]">+ option</button>
              </form>

              <DecisionSettleForm decision={d} statuses={STATUSES} dreamValues={dreamValues} />

              {affected.length > 0 && (
                <section className="mt-3 rounded-[12px] border border-[var(--line)] bg-[var(--pearl)] p-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--gold)]">Decision ledger · affected objects · v{d.version}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {affected.map((object: any, index: number) => (
                      <span key={`${object.type}-${index}`} title={object.note} className="rounded-full bg-[var(--gold-bg)] px-2.5 py-1 text-[11px] text-[var(--ink)]">
                        {object.label || label(object.type)}
                      </span>
                    ))}
                  </div>
                  {d.rationale && <p className="mt-2 text-xs leading-5 text-[var(--ink-soft)]">Reason: {d.rationale}</p>}
                </section>
              )}

              {decisionHistory.length > 0 && (
                <details className="mt-3 rounded-[12px] border border-[var(--line)] bg-[var(--cream)] p-3">
                  <summary className="cursor-pointer text-xs font-medium text-[var(--ink)]">History · {decisionHistory.length} recorded change{decisionHistory.length === 1 ? '' : 's'}</summary>
                  <ol className="mt-2 space-y-2">
                    {decisionHistory.map((event: any) => (
                      <li key={event.id} className="flex items-start justify-between gap-3 text-[11px] leading-5 text-[var(--ink-soft)]">
                        <span>
                          {String(event.action).replace(/_/g, ' ')}
                          {event.meta?.status ? ` · ${label(event.meta.status)}` : ''}
                          {event.actor_id ? ` · ${authorMap.get(event.actor_id) || 'a collaborator'}` : ''}
                        </span>
                        <time className="shrink-0 text-[var(--ink-faint)]">{new Date(event.created_at).toLocaleDateString()}</time>
                      </li>
                    ))}
                  </ol>
                </details>
              )}

              <ObjectComments objectType="decision" objectId={d.id} comments={decisionComments} currentUserId={ws.userId} returnPath="/decisions" />
              <form action={deleteDecision} className="mt-3 text-right">
                <input type="hidden" name="id" value={d.id} />
                <button className="text-[11px] text-[var(--ink-faint)] hover:text-[var(--clay-ink)]">Delete decision</button>
              </form>
            </details>
          );
        })}
      </div>
    </div>
  );
}
