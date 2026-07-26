'use client';

import * as React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { createPlannerWorkspaceFromWalk } from '@/app/(app)/onboarding/actions';
import {
  DREAM_CLOUDS,
  cloudRankLabel,
  compassSentence,
  compassShort,
  rankedDreamClouds,
  type CloudPriorities,
  type DreamCloudId,
} from '@/lib/engine/dream-clouds';
import { track } from '@/lib/analytics';
import { Button, Card, Field, Input, SaveState, Textarea, type SyncStatus } from '@/design-system';

interface PlannerDraft {
  step: number;
  partnerOneLabel: string;
  partnerTwoLabel: string;
  coupleFeeling: string;
  priorities: CloudPriorities;
  season: string;
  light: string;
  guestScale: string;
}

const DRAFT_KEY = 'missing-peace:planner-walk:v1';
const DEFAULT_DRAFT: PlannerDraft = {
  step: 1,
  partnerOneLabel: '',
  partnerTwoLabel: '',
  coupleFeeling: '',
  priorities: {
    family: 0.82,
    warmth: 0.72,
    table: 0.62,
    ease: 0.5,
    beauty: 0.42,
    memory: 0.36,
    music: 0.3,
  },
  season: 'Fall',
  light: 'Golden hour',
  guestScale: 'gathering',
};

const GUEST_SCALES = [
  { id: 'intimate', label: 'Intimate · about 40', estimate: 40 },
  { id: 'gathering', label: 'A full gathering · about 90', estimate: 90 },
  { id: 'expansive', label: 'Expansive · about 160', estimate: 160 },
];

function safeDraft(value: unknown): PlannerDraft {
  if (!value || typeof value !== 'object') return DEFAULT_DRAFT;
  const draft = value as Partial<PlannerDraft>;
  return {
    ...DEFAULT_DRAFT,
    ...draft,
    step: Math.max(1, Math.min(3, Number(draft.step) || 1)),
    priorities: { ...DEFAULT_DRAFT.priorities, ...(draft.priorities ?? {}) },
  };
}

export function PlannerWalk() {
  const [draft, setDraft] = React.useState(DEFAULT_DRAFT);
  const [hydrated, setHydrated] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<SyncStatus>('idle');

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DRAFT_KEY);
      if (stored) setDraft(safeDraft(JSON.parse(stored)));
    } catch {
      setSaveStatus('error');
    } finally {
      setHydrated(true);
      track('dream_walk_started', { creatorRole: 'planner' }, { surface: 'client' });
    }
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    setSaveStatus('saving');
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setSaveStatus('local');
      } catch {
        setSaveStatus('error');
      }
    }, 180);
    return () => window.clearTimeout(timer);
  }, [draft, hydrated]);

  const ranked = React.useMemo(() => rankedDreamClouds(draft.priorities), [draft.priorities]);
  const sentence = React.useMemo(() => compassSentence(draft.priorities), [draft.priorities]);
  const short = React.useMemo(() => compassShort(draft.priorities), [draft.priorities]);
  const guestEstimate = GUEST_SCALES.find((scale) => scale.id === draft.guestScale)?.estimate ?? 90;
  const patch = (next: Partial<PlannerDraft>) => setDraft((current) => ({ ...current, ...next }));
  const setPriority = (id: DreamCloudId, value: number) => setDraft((current) => ({
    ...current,
    priorities: { ...current.priorities, [id]: Math.max(0.04, Math.min(1, value)) },
  }));

  return (
    <form
      action={createPlannerWorkspaceFromWalk}
      onSubmit={() => {
        try { window.localStorage.removeItem(DRAFT_KEY); } catch {}
      }}
      className="mx-auto max-w-5xl"
    >
      <input type="hidden" name="workspaceName" value={`${draft.partnerOneLabel || 'Partner One'} & ${draft.partnerTwoLabel || 'Partner Two'}`} />
      <input type="hidden" name="partnerOneLabel" value={draft.partnerOneLabel} />
      <input type="hidden" name="partnerTwoLabel" value={draft.partnerTwoLabel} />
      <input type="hidden" name="coupleFeeling" value={draft.coupleFeeling} />
      <input type="hidden" name="cloudPriorities" value={JSON.stringify(draft.priorities)} />
      <input type="hidden" name="dateSeason" value={draft.season} />
      <input type="hidden" name="dateYear" value={String(new Date().getFullYear() + 1)} />
      <input type="hidden" name="light" value={draft.light} />
      <input type="hidden" name="guestScale" value={draft.guestScale} />
      <input type="hidden" name="guestEstimate" value={String(guestEstimate)} />
      <input type="hidden" name="guestMax" value={String(Math.round(guestEstimate * 1.15))} />
      {ranked.slice(0, 4).map(({ cloud }) => <input key={cloud.id} type="hidden" name="priorities" value={cloud.label} />)}

      <div className="mb-4 flex items-center gap-4">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--pearl)]" aria-label={`Planner Walk ${Math.round((draft.step / 3) * 100)}% complete`}>
          <div className="h-full rounded-full bg-[var(--clay)] transition-[width] motion-reduce:transition-none" style={{ width: `${(draft.step / 3) * 100}%` }} />
        </div>
        <SaveState status={saveStatus} />
      </div>

      {draft.step === 1 && (
        <Card elevation="lifted" className="p-6 sm:p-9">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--gold)]">Planner Walk · 1</p>
          <h1 className="voice mt-2 text-4xl">Listen for the couple&apos;s feeling.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">
            This is not your aesthetic brief. Capture the feeling they want to recognize in every later decision.
          </p>
          <div className="mt-7 grid gap-4 sm:grid-cols-2">
            <Field label="Partner one">
              {(props) => <Input {...props} value={draft.partnerOneLabel} onChange={(event) => patch({ partnerOneLabel: event.target.value })} placeholder="Maya" />}
            </Field>
            <Field label="Partner two">
              {(props) => <Input {...props} value={draft.partnerTwoLabel} onChange={(event) => patch({ partnerTwoLabel: event.target.value })} placeholder="Julian" />}
            </Field>
          </div>
          <Field className="mt-5" label="What should their day feel like?" hint="Use their words when you can.">
            {(props) => <Textarea {...props} rows={5} value={draft.coupleFeeling} onChange={(event) => patch({ coupleFeeling: event.target.value })} placeholder="Warm, unhurried, like both families have always belonged at the same table…" />}
          </Field>
          <div className="mt-8 flex justify-end">
            <Button type="button" onClick={() => patch({ step: 2 })} disabled={!draft.coupleFeeling.trim()}>
              Carry this forward <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {draft.step === 2 && (
        <Card elevation="lifted" className="p-6 sm:p-9">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--gold)]">Planner Walk · 2</p>
          <h1 className="voice mt-2 text-4xl">Reflect back what matters most.</h1>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">Move each cloud toward the center as the couple gives it more weight.</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {DREAM_CLOUDS.map((cloud) => {
              const value = draft.priorities[cloud.id] ?? 0.3;
              return (
                <label key={cloud.id} className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4">
                  <span className="flex items-center justify-between gap-3">
                    <span>
                      <span className="voice block text-xl text-[var(--ink)]">{cloud.label}</span>
                      <span className="block text-xs text-[var(--ink-soft)]">{cloud.phrase}</span>
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-[var(--gold)]">{cloudRankLabel(ranked.findIndex((item) => item.cloud.id === cloud.id), value)}</span>
                  </span>
                  <input
                    className="mt-4 w-full accent-[var(--clay)]"
                    type="range"
                    min="4"
                    max="100"
                    value={Math.round(value * 100)}
                    onChange={(event) => setPriority(cloud.id, Number(event.target.value) / 100)}
                    aria-label={`${cloud.label} priority`}
                  />
                </label>
              );
            })}
          </div>
          <div className="mt-8 flex justify-between">
            <Button type="button" variant="ghost" onClick={() => patch({ step: 1 })}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button type="button" onClick={() => patch({ step: 3 })}>See their Compass <ArrowRight className="h-4 w-4" /></Button>
          </div>
        </Card>
      )}

      {draft.step === 3 && (
        <Card elevation="lifted" className="overflow-hidden p-6 sm:p-9">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--gold)]">Planner Walk · 3</p>
          <h1 className="voice mt-2 text-4xl">Carry the couple&apos;s feeling into every decision.</h1>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <Field label="Season">
              {(props) => <select {...props} value={draft.season} onChange={(event) => patch({ season: event.target.value })} className="h-10 w-full rounded-[10px] border border-[var(--line)] bg-[var(--pearl)] px-3 text-sm">{['Spring', 'Summer', 'Fall', 'Winter'].map((item) => <option key={item}>{item}</option>)}</select>}
            </Field>
            <Field label="Light">
              {(props) => <select {...props} value={draft.light} onChange={(event) => patch({ light: event.target.value })} className="h-10 w-full rounded-[10px] border border-[var(--line)] bg-[var(--pearl)] px-3 text-sm">{['Sunrise', 'Golden hour', 'Candlelight', 'Starlight'].map((item) => <option key={item}>{item}</option>)}</select>}
            </Field>
            <Field label="Guest scale">
              {(props) => <select {...props} value={draft.guestScale} onChange={(event) => patch({ guestScale: event.target.value })} className="h-10 w-full rounded-[10px] border border-[var(--line)] bg-[var(--pearl)] px-3 text-sm">{GUEST_SCALES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select>}
            </Field>
          </div>
          <section className="mx-auto mt-8 max-w-2xl rounded-[18px] border border-[var(--gold)] bg-[var(--gold-bg)] p-6 text-center">
            <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--gold)]">Draft · Couple Compass</p>
            <h2 className="voice mt-3 text-3xl text-[var(--ink)]">{short}</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--ink-soft)]">{sentence}</p>
            <p className="mt-4 text-xs text-[var(--ink-faint)]">Source · your listening notes + the couple&apos;s seven Dream Clouds</p>
          </section>
          <div className="mt-8 flex justify-between">
            <Button type="button" variant="ghost" onClick={() => patch({ step: 2 })}><ArrowLeft className="h-4 w-4" /> Back</Button>
            <Button type="submit">Create their planning world</Button>
          </div>
        </Card>
      )}
    </form>
  );
}
