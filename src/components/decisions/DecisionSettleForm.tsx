'use client';

import * as React from 'react';
import { setDecisionFinal, type DecisionSaveResult } from '@/app/(app)/planning/actions';
import { deriveDecisionRipple } from '@/lib/engine/decision-ripple';
import { combineConflictValues, mergeConflict } from '@/lib/collaboration/merge-conflict';
import { markDraftRetry, parseDraftQueue, removeDraft, upsertDraft, type DraftQueueItem } from '@/lib/collaboration/draft-queue';
import { Button, Chip, Dialog, Field, Input, SaveState, Textarea, type SyncStatus } from '@/design-system';

interface DecisionDraft {
  final_choice: string;
  rationale: string;
  linked_dream_value: string;
  status: string;
}

interface Props {
  decision: {
    id: string;
    category: string;
    status: string;
    final_choice?: string | null;
    rationale?: string | null;
    linked_dream_value?: string | null;
    linked_dream_ids?: string[] | null;
    version?: number | null;
  };
  statuses: string[];
  dreamValues: { id: string; label: string }[];
}

const label = (value: string) => value.replace(/_/g, ' ');
const QUEUE_KEY = 'missing-peace:decision-drafts:v1';

export function DecisionSettleForm({ decision, statuses, dreamValues }: Props) {
  const initial: DecisionDraft = {
    final_choice: decision.final_choice ?? '',
    rationale: decision.rationale ?? '',
    linked_dream_value: decision.linked_dream_value ?? '',
    status: decision.status,
  };
  const [draft, setDraft] = React.useState(initial);
  const draftRef = React.useRef(initial);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [saveState, setSaveState] = React.useState<SyncStatus>('idle');
  const [conflict, setConflict] = React.useState<NonNullable<DecisionSaveResult['conflict']> | null>(null);
  const [resolved, setResolved] = React.useState<Record<string, unknown>>({});
  const effects = React.useMemo(
    () => deriveDecisionRipple(decision.category, decision.final_choice, draft.final_choice),
    [decision.category, decision.final_choice, draft.final_choice],
  );
  const base = React.useMemo(() => ({ ...initial }), []);
  const selectedDream = dreamValues.find((value) => value.label === draft.linked_dream_value);

  function readQueue() {
    return parseDraftQueue<DecisionDraft>(window.localStorage.getItem(QUEUE_KEY));
  }

  function writeQueue(queue: DraftQueueItem<DecisionDraft>[]) {
    window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }

  function queueDraft(values: DecisionDraft, retry = false) {
    try {
      const queue = readQueue();
      const existing = queue.find((item) => item.id === decision.id);
      const item: DraftQueueItem<DecisionDraft> = {
        id: decision.id,
        baseVersion: Number(decision.version ?? 1),
        changes: values,
        timestamp: Date.now(),
        retryCount: retry ? Math.max(1, (existing?.retryCount ?? 0) + 1) : (existing?.retryCount ?? 0),
      };
      writeQueue(upsertDraft(queue, item));
      setSaveState(retry ? 'error' : 'local');
    } catch {
      setSaveState('error');
    }
  }

  function clearQueuedDraft() {
    try {
      writeQueue(removeDraft(readQueue(), decision.id));
    } catch {
      // A successful server save is still authoritative.
    }
  }

  const patch = (next: Partial<DecisionDraft>) => {
    const updated = { ...draftRef.current, ...next };
    draftRef.current = updated;
    setDraft(updated);
    queueDraft(updated);
  };

  function commit(values: DecisionDraft, force = false, version = Number(decision.version ?? 1)) {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      queueDraft(values, true);
      setPreviewOpen(false);
      return;
    }
    startTransition(async () => {
      setSaveState('saving');
      const formData = new FormData();
      formData.set('id', decision.id);
      formData.set('final_choice', values.final_choice);
      formData.set('rationale', values.rationale);
      formData.set('linked_dream_value', values.linked_dream_value);
      formData.set('linked_dream_id', dreamValues.find((value) => value.label === values.linked_dream_value)?.id ?? '');
      formData.set('status', values.status);
      formData.set('base_version', String(version));
      formData.set('base_json', JSON.stringify(base));
      if (force) formData.set('force', 'true');
      try {
        const result = await setDecisionFinal(formData);
        if (!result.ok && result.conflict) {
          setConflict(result.conflict);
          setSaveState('conflict');
          setPreviewOpen(false);
          setResolved({});
          return;
        }
        clearQueuedDraft();
        setSaveState('saved');
        setPreviewOpen(false);
        setConflict(null);
      } catch {
        try {
          writeQueue(markDraftRetry(readQueue(), decision.id, Date.now()));
        } catch {
          // The in-memory draft still remains editable.
        }
        setSaveState('error');
      }
    });
  }

  React.useEffect(() => {
    let queued: DraftQueueItem<DecisionDraft> | undefined;
    try {
      queued = readQueue().find((item) => item.id === decision.id);
      if (queued) {
        draftRef.current = queued.changes;
        setDraft(queued.changes);
        setSaveState(queued.retryCount > 0 ? 'error' : 'local');
      }
    } catch {
      setSaveState('error');
    }

    const syncQueued = () => {
      try {
        const item = readQueue().find((entry) => entry.id === decision.id);
        if (item && item.retryCount > 0) commit(item.changes, false, item.baseVersion);
      } catch {
        setSaveState('error');
      }
    };
    window.addEventListener('online', syncQueued);
    if (queued && queued.retryCount > 0 && navigator.onLine) syncQueued();
    return () => window.removeEventListener('online', syncQueued);
    // The queue is scoped by object id; commit reads the stored payload rather than component state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decision.id]);

  const merge = conflict ? mergeConflict(
    conflict.base as Record<string, unknown>,
    conflict.mine as Record<string, unknown>,
    conflict.theirs as Record<string, unknown>,
  ) : null;

  function resolveAndSave() {
    if (!conflict || !merge) return;
    const values = { ...merge.merged, ...resolved } as unknown as DecisionDraft;
    draftRef.current = values;
    setDraft(values);
    commit(values, true, conflict.currentVersion);
  }

  return (
    <>
      <div className="mt-3 grid gap-2 rounded-[12px] bg-[var(--cream)] p-3">
        <div className="flex flex-wrap gap-2">
          <Field label="Final choice" className="min-w-[150px] flex-1">
            {(props) => <Input {...props} value={draft.final_choice} onChange={(event) => patch({ final_choice: event.target.value })} placeholder="Final choice" />}
          </Field>
          <Field label="Linked Dream Cloud" className="min-w-[150px] flex-1">
            {(props) => (
              <>
                <Input {...props} value={draft.linked_dream_value} onChange={(event) => patch({ linked_dream_value: event.target.value })} list={`dream-${decision.id}`} placeholder="Choose a Compass value" />
                <datalist id={`dream-${decision.id}`}>{dreamValues.map((value) => <option key={value.id} value={value.label} />)}</datalist>
              </>
            )}
          </Field>
          <Field label="State" className="min-w-[130px]">
            {(props) => (
              <select
                {...props}
                value={draft.status}
                onChange={(event) => patch({ status: event.target.value })}
                className="h-10 w-full rounded-[10px] border border-[var(--line)] bg-[var(--pearl)] px-3 text-sm"
              >
                {statuses.map((status) => <option key={status} value={status}>{label(status)}</option>)}
              </select>
            )}
          </Field>
        </div>
        <Field label="Reason">
          {(props) => <Textarea {...props} rows={2} value={draft.rationale} onChange={(event) => patch({ rationale: event.target.value })} placeholder="Why is this the peaceful choice?" />}
        </Field>
        <div className="flex items-center justify-end gap-3">
          <SaveState status={saveState} savedHint="to the shared plan" />
          <Button size="sm" onClick={() => setPreviewOpen(true)} disabled={!draft.final_choice.trim()}>
            Preview ripple
          </Button>
        </div>
      </div>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title="What this decision will change"
        description="The decision is not applied until you confirm this preview."
        footer={(
          <>
            <Button variant="ghost" onClick={() => setPreviewOpen(false)}>Keep editing</Button>
            <Button isLoading={pending} onClick={() => commit(draft)}>Set in peace</Button>
          </>
        )}
      >
        <div className="mb-3 flex flex-wrap gap-2">
          {selectedDream && <Chip tone="gold">Compass · {selectedDream.label}</Chip>}
          <Chip tone="neutral">{label(draft.status)}</Chip>
        </div>
        <ul className="max-h-[48vh] space-y-2 overflow-y-auto">
          {effects.map((effect) => (
            <li key={effect.type} className="rounded-[10px] border border-[var(--line)] bg-[var(--cream)]/45 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[var(--ink)]">{effect.label}</span>
                <Chip tone={effect.severity === 'high' ? 'clay' : effect.severity === 'med' ? 'gold' : 'sage'}>{effect.severity || 'linked'}</Chip>
              </div>
              <p className="mt-1 text-xs leading-5 text-[var(--ink-soft)]">{effect.note}</p>
            </li>
          ))}
        </ul>
      </Dialog>

      <Dialog
        open={!!conflict}
        onClose={() => setConflict(null)}
        title="Conflict needs your choice"
        description="Someone changed the same decision from your base version. Other fields were merged automatically."
        footer={(
          <>
            <Button variant="ghost" onClick={() => setConflict(null)}>Return to edit</Button>
            <Button
              onClick={resolveAndSave}
              isLoading={pending}
              disabled={!merge || merge.conflicts.some((field) => !(field.field in resolved))}
            >
              Save resolution
            </Button>
          </>
        )}
      >
        <div className="space-y-3">
          {merge?.conflicts.map((field) => (
            <section key={field.field} className="rounded-[12px] border border-[var(--line)] p-3">
              <h3 className="text-sm font-medium capitalize text-[var(--ink)]">{label(field.field)}</h3>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                <ConflictChoice label="Keep mine" value={field.mine} selected={resolved[field.field] === field.mine} onChoose={() => setResolved((current) => ({ ...current, [field.field]: field.mine }))} />
                <ConflictChoice label="Keep theirs" value={field.theirs} selected={resolved[field.field] === field.theirs} onChoose={() => setResolved((current) => ({ ...current, [field.field]: field.theirs }))} />
              </div>
              {field.canCombine && (
                <Button
                  className="mt-2"
                  size="sm"
                  variant="gold"
                  onClick={() => setResolved((current) => ({ ...current, [field.field]: combineConflictValues(field.mine, field.theirs) }))}
                >
                  Combine both
                </Button>
              )}
            </section>
          ))}
        </div>
      </Dialog>
    </>
  );
}

function ConflictChoice({ label: choiceLabel, value, selected, onChoose }: { label: string; value: unknown; selected: boolean; onChoose: () => void }) {
  return (
    <button
      type="button"
      onClick={onChoose}
      className={`rounded-[10px] border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${selected ? 'border-[var(--clay)] bg-[var(--clay-bg)]' : 'border-[var(--line)] bg-[var(--pearl)]'}`}
    >
      <span className="block text-xs font-medium text-[var(--ink)]">{choiceLabel}</span>
      <span className="mt-1 block whitespace-pre-wrap text-xs leading-5 text-[var(--ink-soft)]">{String(value ?? 'Empty')}</span>
    </button>
  );
}
