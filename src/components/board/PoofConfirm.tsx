'use client';
// Poof confirm/edit step (Build Plan v2 §5.1). Loads the smart prefill, lets the couple
// edit it (especially the AI category guess) before committing. The board item is never
// destroyed — poof is additive + reversible.
import { useEffect, useMemo, useState, useTransition } from 'react';
import { getPoofPrefill, poofAction } from '@/app/(app)/board/actions';
import vendorCats from '@/lib/seed/vendor-categories.json';
import type { PoofTarget } from '@/lib/types';

const TARGET_LABEL: Record<PoofTarget, string> = {
  vendor: 'vendor', task: 'task', budget_item: 'Money Map item', decision: 'decision',
  event: 'timeline event', document: 'document', honeymoon_item: 'honeymoon activity',
  guest_experience_note: 'guest experience note',
};
const TASK_CATS = ['budget','venue','vendor','guest','design','attire','food','legal','travel','beauty','ceremony','reception','honeymoon','post_wedding'];
const DECISION_CATS = ['budget','guest','vendor','design','attire','menu','venue','timeline','family','cultural_religious','honeymoon'];
const LONG = new Set(['internal_notes', 'description', 'body', 'notes', 'note']);

function humanize(key: string) {
  return key.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
}

export function PoofConfirm({
  workspaceId, boardItemId, target, onCancel, onDone,
}: {
  workspaceId: string; boardItemId: string; target: PoofTarget;
  onCancel: () => void; onDone: (r: { targetType: string; targetId: string }) => void;
}) {
  const [fields, setFields] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    let live = true;
    getPoofPrefill(workspaceId, boardItemId, target)
      .then((p) => { if (live) setFields(stringify(p)); })
      .catch((e) => live && setError(String(e?.message ?? e)));
    return () => { live = false; };
  }, [workspaceId, boardItemId, target]);

  const categoryOptions = useMemo(() => {
    if (target === 'vendor') return (vendorCats as { categories: string[] }).categories;
    if (target === 'task') return TASK_CATS;
    if (target === 'decision') return DECISION_CATS;
    return null;
  }, [target]);

  function set(key: string, value: string) {
    setFields((f) => (f ? { ...f, [key]: value } : f));
  }

  function commit() {
    if (!fields) return;
    setError(null);
    start(async () => {
      try {
        const overrides = Object.fromEntries(Object.entries(fields).filter(([, v]) => v !== ''));
        const r = await poofAction({ workspaceId, boardItemId, target, overrides });
        onDone({ targetType: r.targetType, targetId: r.targetId });
      } catch (e: any) {
        setError(String(e?.message ?? e));
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onCancel}>
      <div className="w-full max-w-md rounded-card border border-[var(--line)] bg-[var(--pearl)] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="voice text-xl">Set in peace — new {TARGET_LABEL[target]}</h2>
        <p className="mt-1 text-xs text-[var(--ink-faint)]">Edit the details, then commit. Your inspiration stays on the board.</p>

        {!fields && !error && <p className="mt-4 text-sm text-[var(--ink-soft)]">Preparing…</p>}
        {error && <p className="mt-4 rounded-md bg-[var(--clay-bg)] px-3 py-2 text-sm text-[var(--clay-ink)]">{error}</p>}

        {fields && (
          <div className="mt-4 space-y-3">
            {Object.entries(fields).map(([key, value]) => (
              <label key={key} className="block">
                <span className="text-xs font-medium text-[var(--ink-soft)]">{humanize(key)}</span>
                {key === 'category' && categoryOptions ? (
                  <select value={value} onChange={(e) => set(key, e.target.value)} className="mt-1 w-full rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--gold)]">
                    {categoryOptions.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
                  </select>
                ) : LONG.has(key) ? (
                  <textarea value={value} onChange={(e) => set(key, e.target.value)} rows={3} className="mt-1 w-full rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--gold)]" />
                ) : (
                  <input value={value} onChange={(e) => set(key, e.target.value)} className="mt-1 w-full rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--gold)]" />
                )}
              </label>
            ))}
          </div>
        )}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onCancel} className="rounded-[var(--radius)] border border-[var(--line)] px-4 py-2 text-sm text-[var(--ink-soft)]">Cancel</button>
          <button onClick={commit} disabled={pending || !fields} className="rounded-[var(--radius)] bg-[var(--clay)] px-4 py-2 text-sm text-white disabled:opacity-60">
            {pending ? 'Setting in peace…' : '✦ Set in peace'}
          </button>
        </div>
      </div>
    </div>
  );
}

function stringify(p: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(p)) {
    if (v === null || v === undefined) out[k] = '';
    else if (typeof v === 'object') continue; // skip nested objects
    else out[k] = String(v);
  }
  return out;
}
