'use client';

import * as React from 'react';
import { ArrowLeft, ArrowRight, Compass, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createWorkspaceFromOnboarding } from '@/app/(app)/onboarding/actions';
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
import { Button, Card, Chip, Field, Input, SaveState, Textarea, type SyncStatus } from '@/design-system';

type CreatorRole = 'couple' | 'planner' | 'dreamer';

interface WalkDraft {
  role: CreatorRole | null;
  step: number;
  feeling: string[];
  feelingNote: string;
  priorities: CloudPriorities;
  season: string;
  light: string;
  guestScale: string;
  workspaceName: string;
  partnerOneLabel: string;
  partnerTwoLabel: string;
  revealed: boolean;
}

const DRAFT_KEY = 'missing-peace:dream-walk:v2';
const FEELINGS = ['Warm', 'Joyful', 'Peaceful', 'Intimate', 'Playful', 'Sacred', 'Expansive'];
const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];
const LIGHTS = ['Sunrise', 'Golden hour', 'Candlelight', 'Starlight'];
const GUEST_SCALES = [
  { id: 'intimate', label: 'Intimate', note: 'About 40 people', estimate: 40 },
  { id: 'gathering', label: 'A full gathering', note: 'About 90 people', estimate: 90 },
  { id: 'expansive', label: 'Expansive', note: 'About 160 people', estimate: 160 },
];

const DEFAULT_DRAFT: WalkDraft = {
  role: null,
  step: 0,
  feeling: [],
  feelingNote: '',
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
  workspaceName: '',
  partnerOneLabel: '',
  partnerTwoLabel: '',
  revealed: false,
};

function safeDraft(value: unknown): WalkDraft {
  if (!value || typeof value !== 'object') return DEFAULT_DRAFT;
  const draft = value as Partial<WalkDraft>;
  return {
    ...DEFAULT_DRAFT,
    ...draft,
    role: draft.role === 'couple' || draft.role === 'planner' || draft.role === 'dreamer' ? draft.role : null,
    feeling: Array.isArray(draft.feeling) ? draft.feeling.filter((item): item is string => typeof item === 'string') : [],
    priorities: { ...DEFAULT_DRAFT.priorities, ...(draft.priorities ?? {}) },
    step: Math.max(0, Math.min(3, Number(draft.step) || 0)),
  };
}

export function DreamWalkOnboarding() {
  const router = useRouter();
  const [draft, setDraft] = React.useState<WalkDraft>(DEFAULT_DRAFT);
  const [hydrated, setHydrated] = React.useState(false);
  const [saveStatus, setSaveStatus] = React.useState<SyncStatus>('idle');

  React.useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DRAFT_KEY);
      if (stored) setDraft(safeDraft(JSON.parse(stored)));
    } catch {
      // A blocked local store never blocks the walk.
    } finally {
      setHydrated(true);
    }
  }, []);

  React.useEffect(() => {
    if (!hydrated) return;
    setSaveStatus('saving');
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        setSaveStatus('saved');
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

  const patch = React.useCallback((next: Partial<WalkDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
  }, []);

  function chooseRole(role: CreatorRole) {
    if (role === 'planner') {
      track('dream_walk_started', { creatorRole: 'planner' }, { surface: 'client' });
      router.push('/planner/walk');
      return;
    }
    patch({ role, step: 1 });
    track('dream_walk_started', { creatorRole: role }, { surface: 'client' });
  }

  function toggleFeeling(feeling: string) {
    setDraft((current) => ({
      ...current,
      feeling: current.feeling.includes(feeling)
        ? current.feeling.filter((item) => item !== feeling)
        : [...current.feeling, feeling],
    }));
  }

  function setPriority(id: DreamCloudId, value: number) {
    setDraft((current) => ({
      ...current,
      priorities: { ...current.priorities, [id]: Math.max(0.04, Math.min(1, value)) },
    }));
  }

  function revealCompass() {
    patch({ revealed: true });
    track('compass_revealed', {}, { surface: 'client' });
  }

  function finishWalk() {
    track('dream_walk_completed', { creatorRole: draft.role ?? 'couple', stepsCompleted: 3 }, { surface: 'client' });
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch {
      // The server write remains the durable completion.
    }
  }

  const progress = draft.step === 0 ? 0 : Math.round((draft.step / 3) * 100);

  return (
    <form action={createWorkspaceFromOnboarding} onSubmit={finishWalk} className="mx-auto max-w-5xl">
      <input type="hidden" name="creatorRole" value={draft.role ?? 'couple'} />
      <input type="hidden" name="workspaceName" value={draft.workspaceName || 'Our Wedding'} />
      <input type="hidden" name="partnerOneLabel" value={draft.partnerOneLabel} />
      <input type="hidden" name="partnerTwoLabel" value={draft.partnerTwoLabel} />
      <input type="hidden" name="dateStatus" value="range" />
      <input type="hidden" name="dateSeason" value={draft.season} />
      <input type="hidden" name="dateYear" value={String(new Date().getFullYear() + 1)} />
      <input type="hidden" name="guestEstimate" value={String(guestEstimate)} />
      <input type="hidden" name="guestMax" value={String(Math.round(guestEstimate * 1.15))} />
      <input type="hidden" name="budgetConfidence" value="unknown" />
      <input type="hidden" name="cloudPriorities" value={JSON.stringify(draft.priorities)} />
      <input type="hidden" name="light" value={draft.light} />
      <input type="hidden" name="guestScale" value={draft.guestScale} />
      <input type="hidden" name="partnerOneReflection" value={draft.feelingNote} />
      <input type="hidden" name="sharedMeaning" value={sentence} />
      <input type="hidden" name="hospitalityMeaning" value={ranked.find((item) => item.cloud.id === 'table')?.cloud.phrase ?? ''} />
      <input type="hidden" name="musicAtmosphere" value={`${draft.light}; ${ranked.find((item) => item.cloud.id === 'music')?.cloud.phrase ?? ''}`} />
      <input type="hidden" name="planningValues" value={draft.feeling.join(', ')} />
      {ranked.slice(0, 4).map(({ cloud }) => <input key={cloud.id} type="hidden" name="priorities" value={cloud.label} />)}
      {draft.priorities.ease && draft.priorities.ease >= 0.55 && <input type="hidden" name="nonNegotiables" value="Protect ease and calm" />}

      <div className="mb-4 flex items-center gap-4">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[var(--pearl)]" aria-label={`Dream Walk ${progress}% complete`}>
          <div className="h-full rounded-full bg-[var(--clay)] transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
        </div>
        <SaveState status={saveStatus} savedHint="on this device" />
      </div>

      {draft.step === 0 && (
        <Card elevation="lifted" className="relative overflow-hidden p-6 text-center sm:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,var(--gold-bg),transparent_55%)] opacity-70" />
          <div className="relative mx-auto max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--gold)]">The threshold</p>
            <h1 className="voice mt-4 text-4xl leading-tight sm:text-6xl">Arrive as you are. Begin with what the day should feel like.</h1>
            <p className="mx-auto mt-5 max-w-xl text-sm leading-6 text-[var(--ink-soft)]">
              Three quiet steps will shape a Wedding Compass you can carry into every decision.
            </p>
            <fieldset className="mt-9">
              <legend className="voice text-xl text-[var(--ink)]">I&apos;m arriving as…</legend>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {([
                  ['couple', 'A couple', 'Build the Compass together.'],
                  ['planner', 'A planner', 'Carry each couple’s feeling into the work.'],
                  ['dreamer', 'A dreamer', 'Explore without pressure to approve.'],
                ] as const).map(([role, label, note]) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => chooseRole(role)}
                    className="rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[var(--gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
                  >
                    <span className="voice block text-xl text-[var(--ink)]">{label}</span>
                    <span className="mt-2 block text-xs leading-5 text-[var(--ink-soft)]">{note}</span>
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </Card>
      )}

      {draft.step === 1 && (
        <Card elevation="lifted" className="p-6 sm:p-9">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--gold)]">1 · Notice the feeling</p>
          <h1 className="voice mt-2 text-4xl">When people arrive, what should they feel first?</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">Choose as many as feel true. Uncertainty is welcome; you can return at any time.</p>
          <div className="mt-7 flex flex-wrap gap-2" role="group" aria-label="Wedding feelings">
            {FEELINGS.map((feeling) => (
              <button key={feeling} type="button" onClick={() => toggleFeeling(feeling)}>
                <Chip tone={draft.feeling.includes(feeling) ? 'clay' : 'neutral'} selected={draft.feeling.includes(feeling)}>
                  {feeling}
                </Chip>
              </button>
            ))}
          </div>
          <Field className="mt-7" label="A feeling in your own words" hint="Optional. This reflection stays part of your Dream.">
            {(props) => (
              <Textarea
                {...props}
                value={draft.feelingNote}
                onChange={(event) => patch({ feelingNote: event.target.value })}
                placeholder="It should feel like everyone exhaled when they walked in…"
              />
            )}
          </Field>
          <div className="mt-8 flex justify-between">
            <Button variant="ghost" onClick={() => patch({ step: 0, role: null })} leadingIcon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
            <Button onClick={() => patch({ step: 2 })} trailingIcon={<ArrowRight className="h-4 w-4" />}>Name what matters</Button>
          </div>
        </Card>
      )}

      {draft.step === 2 && (
        <Card elevation="lifted" className="p-5 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--gold)]">2 · Name what matters</p>
          <h1 className="voice mt-2 text-4xl">Bring each Dream Cloud toward the Compass.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--ink-soft)]">
            Closer clouds carry more weight. The slider is the keyboard-accessible path for the same drag-to-priority model.
          </p>

          <div className="mt-7 grid gap-3 lg:grid-cols-[1fr_220px_1fr]">
            <div className="grid gap-3">
              {DREAM_CLOUDS.slice(0, 4).map((cloud) => {
                const priority = Number(draft.priorities[cloud.id] ?? 0.4);
                const rank = ranked.findIndex((item) => item.cloud.id === cloud.id);
                return (
                  <CloudPriority key={cloud.id} cloud={cloud} priority={priority} rank={rank} onChange={(value) => setPriority(cloud.id, value)} />
                );
              })}
            </div>
            <div className="order-first flex min-h-[190px] items-center justify-center lg:order-none">
              <div className="flex h-44 w-44 flex-col items-center justify-center rounded-full border border-[var(--gold)] bg-[radial-gradient(circle_at_45%_35%,var(--pearl),var(--gold-bg))] p-5 text-center shadow-[0_18px_46px_rgba(58,54,49,.12)]">
                <Compass className="h-5 w-5 text-[var(--gold)]" aria-hidden />
                <p className="mt-2 text-[9px] uppercase tracking-[0.17em] text-[var(--ink-faint)]">Wedding Compass</p>
                <p className="voice mt-1 text-sm leading-4 text-[var(--ink)]">{short}</p>
              </div>
            </div>
            <div className="grid gap-3">
              {DREAM_CLOUDS.slice(4).map((cloud) => {
                const priority = Number(draft.priorities[cloud.id] ?? 0.4);
                const rank = ranked.findIndex((item) => item.cloud.id === cloud.id);
                return (
                  <CloudPriority key={cloud.id} cloud={cloud} priority={priority} rank={rank} onChange={(value) => setPriority(cloud.id, value)} />
                );
              })}
            </div>
          </div>

          <div className="mt-8 flex justify-between">
            <Button variant="ghost" onClick={() => patch({ step: 1 })} leadingIcon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
            <Button onClick={() => patch({ step: 3 })} trailingIcon={<ArrowRight className="h-4 w-4" />}>Carry it into the day</Button>
          </div>
        </Card>
      )}

      {draft.step === 3 && (
        <Card elevation="lifted" className="p-6 sm:p-9">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--gold)]">3 · Carry it into the day</p>
          <h1 className="voice mt-2 text-4xl">Give the Compass a little shape.</h1>
          <div className="mt-7 grid gap-6 lg:grid-cols-2">
            <div className="grid gap-5">
              <ChoiceField legend="Season" values={SEASONS} selected={draft.season} onSelect={(season) => patch({ season })} />
              <ChoiceField legend="Light" values={LIGHTS} selected={draft.light} onSelect={(light) => patch({ light })} />
              <fieldset>
                <legend className="text-xs font-medium text-[var(--ink)]">Rough guest scale</legend>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {GUEST_SCALES.map((scale) => (
                    <button
                      key={scale.id}
                      type="button"
                      aria-pressed={draft.guestScale === scale.id}
                      onClick={() => patch({ guestScale: scale.id })}
                      className={`rounded-[12px] border p-3 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--clay)] ${draft.guestScale === scale.id ? 'border-[var(--clay)] bg-[var(--clay-bg)]' : 'border-[var(--line)] bg-[var(--pearl)]'}`}
                    >
                      <span className="block text-sm font-medium text-[var(--ink)]">{scale.label}</span>
                      <span className="mt-1 block text-[11px] text-[var(--ink-soft)]">{scale.note}</span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Project name">
                  {(props) => <Input {...props} value={draft.workspaceName} onChange={(event) => patch({ workspaceName: event.target.value })} placeholder="Sam & Riley" />}
                </Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="Partner one">
                    {(props) => <Input {...props} value={draft.partnerOneLabel} onChange={(event) => patch({ partnerOneLabel: event.target.value })} placeholder="Sam" />}
                  </Field>
                  <Field label="Partner two">
                    {(props) => <Input {...props} value={draft.partnerTwoLabel} onChange={(event) => patch({ partnerTwoLabel: event.target.value })} placeholder="Riley" />}
                  </Field>
                </div>
              </div>
            </div>

            <div id="compass" className="rounded-[18px] border border-[var(--gold)] bg-[radial-gradient(circle_at_50%_15%,var(--gold-bg),var(--pearl)_60%)] p-6">
              {!draft.revealed ? (
                <div className="flex h-full min-h-[340px] flex-col items-center justify-center text-center">
                  <Sparkles className="h-7 w-7 text-[var(--gold)]" aria-hidden />
                  <h2 className="voice mt-3 text-3xl">Your Compass is ready to reveal.</h2>
                  <p className="mt-3 max-w-sm text-sm leading-6 text-[var(--ink-soft)]">Nothing is locked. This is the current direction, ready to evolve with you.</p>
                  <Button className="mt-6" variant="gold" onClick={revealCompass}>Reveal the Compass</Button>
                </div>
              ) : (
                <div aria-live="polite">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-[var(--gold)]">Your Wedding Compass</p>
                  <h2 className="voice mt-3 text-3xl leading-tight text-[var(--ink)]">{short}</h2>
                  <p className="mt-5 text-sm leading-6 text-[var(--ink-soft)]">{sentence}</p>
                  <div className="mt-5 space-y-2">
                    {ranked.slice(0, 3).map(({ cloud }, index) => (
                      <div key={cloud.id} className="flex items-center justify-between rounded-[10px] bg-[var(--cream)] px-3 py-2">
                        <span className="text-sm text-[var(--ink)]">{cloud.label}</span>
                        <span className="text-[10px] uppercase tracking-wide text-[var(--gold)]">{cloudRankLabel(index, Number(draft.priorities[cloud.id]))}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-5 text-xs leading-5 text-[var(--ink-soft)]">
                    This will shape Atmosphere, Atelier, Guests, Seating, Timeline, Money Map, and Peace Center.
                  </p>
                  <Button type="submit" size="lg" fullWidth className="mt-6">
                    Enter the Dream Workspace
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-8">
            <Button variant="ghost" onClick={() => patch({ step: 2, revealed: false })} leadingIcon={<ArrowLeft className="h-4 w-4" />}>Back</Button>
          </div>
        </Card>
      )}
    </form>
  );
}

function CloudPriority({
  cloud,
  priority,
  rank,
  onChange,
}: {
  cloud: (typeof DREAM_CLOUDS)[number];
  priority: number;
  rank: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="rounded-[999px] border border-[var(--line)] bg-[var(--pearl)] px-4 py-3 shadow-[0_8px_20px_rgba(58,54,49,.06)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[9px] uppercase tracking-[0.14em] text-[var(--ink-faint)]">{cloud.type}</p>
          <p className="voice text-lg text-[var(--ink)]">{cloud.label}</p>
        </div>
        <span className="max-w-[105px] text-right text-[9px] uppercase tracking-wide text-[var(--gold)]">
          {cloudRankLabel(rank, priority)}
        </span>
      </div>
      <label className="mt-2 block text-[10px] text-[var(--ink-soft)]">
        Distance from the Compass
        <input
          className="mt-1 block h-7 w-full accent-[var(--clay)]"
          type="range"
          min="4"
          max="100"
          value={Math.round(priority * 100)}
          onChange={(event) => onChange(Number(event.target.value) / 100)}
          aria-label={`${cloud.label} priority`}
          aria-valuetext={cloudRankLabel(rank, priority)}
        />
      </label>
    </div>
  );
}

function ChoiceField({
  legend,
  values,
  selected,
  onSelect,
}: {
  legend: string;
  values: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-xs font-medium text-[var(--ink)]">{legend}</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((value) => (
          <button key={value} type="button" onClick={() => onSelect(value)} aria-pressed={selected === value}>
            <Chip tone={selected === value ? 'gold' : 'neutral'} selected={selected === value}>{value}</Chip>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
