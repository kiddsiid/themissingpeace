'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useMemo, useState } from 'react';
import { createWorkspaceFromOnboarding } from '@/app/(app)/onboarding/actions';

type Question = {
  id: string;
  eyebrow: string;
  question: string;
  choices: string[];
  reflection: string;
  customPlaceholder?: string;
};

const QUESTIONS: Question[] = [
  {
    id: 'feeling',
    eyebrow: 'the first breath',
    question: 'When people walk into your wedding, what should they feel first?',
    choices: ['Warmth', 'Awe', 'Peace', 'Joy', 'Intimacy', 'Celebration'],
    reflection: 'What would make that feeling unmistakable?',
  },
  {
    id: 'meaning',
    eyebrow: 'what this day carries',
    question: 'What do you want this wedding to mean for the two of you?',
    choices: ['A beginning', 'A homecoming', 'A promise', 'A family gathering', 'A sacred moment', 'A joyful feast'],
    reflection: 'Write the sentence you want the whole plan to remember.',
  },
  {
    id: 'people',
    eyebrow: 'the people in the room',
    question: 'What should your guests remember when they leave?',
    choices: ['They were cared for', 'They felt close to us', 'The food was generous', 'The music carried everyone', 'The ceremony felt true', 'Nothing felt rushed'],
    reflection: 'Who or what needs special care?',
  },
  {
    id: 'culture',
    eyebrow: 'roots and rituals',
    question: 'What traditions, culture, or spiritual meaning should be honored?',
    choices: ['Family blessings', 'Faith tradition', 'Cultural rituals', 'Ancestral memory', 'Chosen-family rituals', 'A private vow moment'],
    reflection: 'Name the tradition, blessing, or memory that matters.',
  },
  {
    id: 'hospitality',
    eyebrow: 'food as feeling',
    question: 'What should food and hospitality communicate?',
    choices: ['Warm family dinner', 'Abundant celebration', 'Elegant service', 'Comfort food', 'Local flavor', 'Late-night joy'],
    reflection: 'What would make the meal feel like you?',
  },
  {
    id: 'music',
    eyebrow: 'the atmosphere',
    question: 'What should the music do for the room?',
    choices: ['Move everyone', 'Hold the ceremony gently', 'Make dinner glow', 'Tell our story', 'Honor family favorites', 'Protect the no-play list'],
    reflection: 'Any songs, moods, or boundaries to remember?',
  },
  {
    id: 'boundaries',
    eyebrow: 'what must stay protected',
    question: 'What should never get lost in the planning?',
    choices: ['Time together', 'Private vows', 'Clear budget', 'Family peace', 'No rushed photos', 'Enough rest'],
    reflection: 'Name the boundary the engine should protect.',
  },
  {
    id: 'avoid',
    eyebrow: 'gentle no list',
    question: 'What should the plan help you avoid?',
    choices: ['Overpacked schedule', 'Performing for others', 'Budget drift', 'Unclear family roles', 'Too much production', 'Last-minute chaos'],
    reflection: 'What would make the planning feel unlike you?',
  },
  {
    id: 'budget',
    eyebrow: 'money with meaning',
    question: 'Where should Money Map protect the Dream first?',
    choices: ['Food and drink', 'Photography', 'Guest comfort', 'Venue feeling', 'Music', 'Ease and support'],
    reflection: 'What is worth spending on, and what can stay simple?',
  },
  {
    id: 'honeymoon',
    eyebrow: 'after the day',
    question: 'If the honeymoon is part of the Dream, what energy should it have?',
    choices: ['Restful', 'Adventurous', 'Romantic', 'Food centered', 'Far away', 'Close and easy'],
    reflection: 'What should the forever trip give back to you?',
  },
];

const FIELD_MAP: Record<string, string> = {
  feeling: 'priorities',
  people: 'planningValues',
  culture: 'culturalValues',
  boundaries: 'nonNegotiables',
  avoid: 'avoid',
  budget: 'priorities',
  honeymoon: 'priorities',
};

const SEASONS = ['Spring', 'Summer', 'Fall', 'Winter'];
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, index) => String(CURRENT_YEAR + index));

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function ChoiceChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'motion-lift rounded-full border px-4 py-2 text-sm transition ' +
        (active ? 'border-[var(--clay)] bg-[var(--clay-bg)] text-[var(--clay-ink)]' : 'border-[#D8C7A6] bg-white/80 text-[var(--ink-soft)]')
      }
    >
      {label}
    </button>
  );
}

export function DreamWalkOnboarding() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  const [basics, setBasics] = useState({
    creatorRole: 'couple',
    workspaceName: '',
    partnerOneLabel: '',
    partnerTwoLabel: '',
    dateStatus: 'none',
    weddingDate: '',
    dateSeason: 'Spring',
    dateYear: String(CURRENT_YEAR + 1),
    desiredYear: String(CURRENT_YEAR + 1),
    guestEstimate: '',
    guestMax: '',
    budgetTotal: '',
    budgetConfidence: 'unknown',
    enableHoneymoon: true,
  });
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [custom, setCustom] = useState<Record<string, string>>({});
  const [reflection, setReflection] = useState<Record<string, string>>({});

  const totalSteps = QUESTIONS.length + 3;
  const progress = Math.round(((step + 1) / totalSteps) * 100);
  const question = QUESTIONS[step - 2];

  function updateBasics(key: keyof typeof basics, value: string | boolean) {
    setBasics((current) => ({ ...current, [key]: value }));
  }

  function toggle(questionId: string, value: string) {
    setSelected((current) => {
      const existing = current[questionId] ?? [];
      return { ...current, [questionId]: existing.includes(value) ? existing.filter((item) => item !== value) : [...existing, value] };
    });
  }

  const hidden = useMemo(() => {
    const fields: Record<string, string[]> = {
      priorities: [],
      nonNegotiables: [],
      avoid: [],
      culturalValues: [],
      traditions: [],
      planningValues: [],
    };
    for (const q of QUESTIONS) {
      const answers = unique([...(selected[q.id] ?? []), custom[q.id] ?? '']);
      const target = FIELD_MAP[q.id];
      if (target) fields[target].push(...answers);
    }
    fields.traditions.push(...unique([...(selected.culture ?? []), custom.culture ?? '']));
    return {
      priorities: unique(fields.priorities),
      nonNegotiables: unique(fields.nonNegotiables),
      avoid: unique(fields.avoid),
      culturalValues: unique(fields.culturalValues),
      traditions: unique(fields.traditions),
      planningValues: unique(fields.planningValues),
      sharedMeaning: reflection.meaning || unique([...(selected.meaning ?? []), custom.meaning ?? '']).join(', '),
      meaning: reflection.people || unique([...(selected.people ?? []), custom.people ?? '']).join(', '),
      hospitalityMeaning: [unique([...(selected.hospitality ?? []), custom.hospitality ?? '']).join(', '), reflection.hospitality].filter(Boolean).join('. '),
      musicAtmosphere: [unique([...(selected.music ?? []), custom.music ?? '']).join(', '), reflection.music].filter(Boolean).join('. '),
      familyMeaning: reflection.culture,
      budgetValues: [unique([...(selected.budget ?? []), custom.budget ?? '']).join(', '), reflection.budget].filter(Boolean).join('. '),
      partnerOneReflection: reflection.feeling,
      partnerTwoReflection: reflection.boundaries,
      dateSeason: basics.dateStatus === 'range' ? basics.dateSeason : '',
      dateYear: basics.dateStatus === 'range' ? basics.dateYear : '',
      desiredYear: basics.dateStatus === 'none' ? basics.desiredYear : '',
    };
  }, [selected, custom, reflection, basics.dateStatus, basics.dateSeason, basics.dateYear, basics.desiredYear]);

  return (
    <form action={createWorkspaceFromOnboarding} className="relative mx-auto max-w-3xl">
      <input type="hidden" name="creatorRole" value={basics.creatorRole} />
      <input type="hidden" name="workspaceName" value={basics.workspaceName || 'Our Wedding'} />
      <input type="hidden" name="partnerOneLabel" value={basics.partnerOneLabel} />
      <input type="hidden" name="partnerTwoLabel" value={basics.partnerTwoLabel} />
      <input type="hidden" name="dateStatus" value={basics.dateStatus} />
      <input type="hidden" name="weddingDate" value={basics.dateStatus === 'known' ? basics.weddingDate : ''} />
      <input type="hidden" name="dateSeason" value={hidden.dateSeason} />
      <input type="hidden" name="dateYear" value={hidden.dateYear} />
      <input type="hidden" name="desiredYear" value={hidden.desiredYear} />
      <input type="hidden" name="guestEstimate" value={basics.guestEstimate} />
      <input type="hidden" name="guestMax" value={basics.guestMax} />
      <input type="hidden" name="budgetTotal" value={basics.budgetTotal} />
      <input type="hidden" name="budgetConfidence" value={basics.budgetConfidence} />
      {basics.enableHoneymoon && <input type="hidden" name="enableHoneymoon" value="on" />}
      {hidden.priorities.map((value) => <input key={`p-${value}`} type="hidden" name="priorities" value={value} />)}
      {hidden.nonNegotiables.map((value) => <input key={`n-${value}`} type="hidden" name="nonNegotiables" value={value} />)}
      {hidden.avoid.map((value) => <input key={`a-${value}`} type="hidden" name="avoid" value={value} />)}
      {hidden.culturalValues.map((value) => <input key={`c-${value}`} type="hidden" name="culturalValues" value={value} />)}
      {hidden.traditions.map((value) => <input key={`t-${value}`} type="hidden" name="traditions" value={value} />)}
      {hidden.planningValues.map((value) => <input key={`v-${value}`} type="hidden" name="planningValues" value={value} />)}
      <input type="hidden" name="sharedMeaning" value={hidden.sharedMeaning} />
      <input type="hidden" name="meaning" value={hidden.meaning} />
      <input type="hidden" name="hospitalityMeaning" value={hidden.hospitalityMeaning} />
      <input type="hidden" name="musicAtmosphere" value={hidden.musicAtmosphere} />
      <input type="hidden" name="familyMeaning" value={hidden.familyMeaning} />
      <input type="hidden" name="budgetValues" value={hidden.budgetValues} />
      <input type="hidden" name="partnerOneReflection" value={hidden.partnerOneReflection} />
      <input type="hidden" name="partnerTwoReflection" value={hidden.partnerTwoReflection} />

      <div className="mb-5 h-2 overflow-hidden rounded-full bg-[var(--pearl)]">
        <div className="motion-progress h-full rounded-full bg-[var(--clay)] transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="relative min-h-[560px] overflow-hidden rounded-[22px] border border-[var(--line)] bg-[var(--pearl)] p-6 shadow-[0_18px_60px_rgba(58,54,49,0.08)] sm:p-8">
        <span className="dream-twinkle" style={{ left: '9%', top: 26, fontSize: 13 }}>+</span>
        <span className="dream-twinkle" style={{ right: '10%', top: 58, fontSize: 16, animationDelay: '1s' }}>+</span>
        <span className="dream-petal" style={{ left: '14%', bottom: 54 }} />
        <span className="dream-petal" style={{ right: '15%', bottom: 90, animationDelay: '2s' }} />

        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="intro"
              initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -14, scale: 0.98 }}
              className="flex min-h-[500px] flex-col items-center justify-center text-center"
            >
              <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-faint)]">Dream Walk</p>
              <h1 className="voice mt-3 text-5xl leading-none">Before the budget, the guest list, and the decisions...</h1>
              <p className="mt-5 max-w-md text-sm leading-6 text-[var(--ink-soft)]">
                Let us find the feeling you are planning toward. A few gentle questions will become your Dream Clouds and Wedding Compass.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <button type="button" onClick={() => setStep(1)} className="rounded-full bg-[var(--clay)] px-6 py-3 text-sm text-white">Begin the Dream Walk</button>
                <button type="button" onClick={() => setStep(1)} className="rounded-full border border-[#D8C7A6] px-6 py-3 text-sm text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]">Save it for later</button>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="basics"
              initial={reduce ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
              className="mx-auto max-w-2xl"
            >
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--ink-faint)]">the doorway</p>
              <h2 className="voice mt-2 text-4xl">Name the world you are entering.</h2>
              <div className="mt-7 grid gap-4">
                <select value={basics.creatorRole} onChange={(event) => updateBasics('creatorRole', event.target.value)} className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2.5 text-sm">
                  <option value="couple">We are the couple</option>
                  <option value="planner">I am the wedding planner</option>
                </select>
                <input value={basics.workspaceName} onChange={(event) => updateBasics('workspaceName', event.target.value)} placeholder="Sam and Riley, Spring 2027" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2.5 text-sm" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={basics.partnerOneLabel} onChange={(event) => updateBasics('partnerOneLabel', event.target.value)} placeholder="Partner one" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
                  <input value={basics.partnerTwoLabel} onChange={(event) => updateBasics('partnerTwoLabel', event.target.value)} placeholder="Partner two" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <select value={basics.dateStatus} onChange={(event) => updateBasics('dateStatus', event.target.value)} className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm">
                    <option value="none">Date not set</option>
                    <option value="known">Date known</option>
                    <option value="range">Season or range</option>
                  </select>
                  {basics.dateStatus === 'known' && (
                    <input type="date" value={basics.weddingDate} onChange={(event) => updateBasics('weddingDate', event.target.value)} className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
                  )}
                  {basics.dateStatus === 'range' && (
                    <>
                      <select value={basics.dateSeason} onChange={(event) => updateBasics('dateSeason', event.target.value)} className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm">
                        {SEASONS.map((season) => <option key={season} value={season}>{season}</option>)}
                      </select>
                      <select value={basics.dateYear} onChange={(event) => updateBasics('dateYear', event.target.value)} className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm">
                        {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
                      </select>
                    </>
                  )}
                  {basics.dateStatus === 'none' && (
                    <select value={basics.desiredYear} onChange={(event) => updateBasics('desiredYear', event.target.value)} className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm">
                      {YEARS.map((year) => <option key={year} value={year}>Potential year: {year}</option>)}
                    </select>
                  )}
                  <input value={basics.guestEstimate} onChange={(event) => updateBasics('guestEstimate', event.target.value)} inputMode="numeric" placeholder="Guest estimate" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <input value={basics.guestMax} onChange={(event) => updateBasics('guestMax', event.target.value)} inputMode="numeric" placeholder="Guest max" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
                  <input value={basics.budgetTotal} onChange={(event) => updateBasics('budgetTotal', event.target.value)} inputMode="numeric" placeholder="Budget" className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm" />
                  <select value={basics.budgetConfidence} onChange={(event) => updateBasics('budgetConfidence', event.target.value)} className="rounded-[var(--radius)] border border-[var(--line)] bg-white px-3 py-2 text-sm">
                    <option value="unknown">Still dreaming</option>
                    <option value="flexible">Flexible</option>
                    <option value="firm">Firm</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-[var(--ink-soft)]">
                  <input type="checkbox" checked={basics.enableHoneymoon} onChange={(event) => updateBasics('enableHoneymoon', event.target.checked)} className="h-4 w-4 accent-[var(--clay)]" />
                  Include honeymoon energy in the Dream Walk
                </label>
              </div>
            </motion.div>
          )}

          {question && (
            <motion.div
              key={question.id}
              initial={reduce ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: -24 }}
              className="mx-auto flex min-h-[500px] max-w-2xl flex-col justify-center"
            >
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--ink-faint)]">{question.eyebrow}</p>
              <h2 className="voice mt-2 text-4xl leading-tight">{question.question}</h2>
              <div className="mt-7 flex flex-wrap gap-2.5">
                {question.choices.map((choice) => (
                  <ChoiceChip key={choice} label={choice} active={(selected[question.id] ?? []).includes(choice)} onClick={() => toggle(question.id, choice)} />
                ))}
              </div>
              <input
                value={custom[question.id] ?? ''}
                onChange={(event) => setCustom((current) => ({ ...current, [question.id]: event.target.value }))}
                placeholder={question.customPlaceholder ?? 'Add your own fragment'}
                className="mt-4 rounded-full border border-[var(--line)] bg-white px-4 py-2 text-sm"
              />
              <textarea
                value={reflection[question.id] ?? ''}
                onChange={(event) => setReflection((current) => ({ ...current, [question.id]: event.target.value }))}
                placeholder={question.reflection}
                rows={4}
                className="mt-4 rounded-[var(--radius)] border border-[var(--line)] bg-white px-4 py-3 text-sm"
              />
              <p className="mt-3 text-[11px] text-[var(--ink-faint)]">Autosaved in this Dream Walk.</p>
            </motion.div>
          )}

          {step === totalSteps - 1 && (
            <motion.div
              key="finish"
              initial={reduce ? false : { opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex min-h-[500px] flex-col items-center justify-center text-center"
            >
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--ink-faint)]">ready to reveal</p>
              <h2 className="voice mt-2 text-5xl leading-none">Your Dream is ready to become clouds.</h2>
              <p className="mt-5 max-w-md text-sm leading-6 text-[var(--ink-soft)]">
                The reflections you chose will gather into the Dream Workspace, where the Wedding Compass can begin to speak back.
              </p>
              <button type="submit" className="mt-8 rounded-full bg-[var(--clay)] px-6 py-3 text-sm text-white">Enter the Dream Workspace</button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <button type="button" onClick={() => setStep((value) => Math.max(0, value - 1))} className="rounded-full border border-[var(--line)] px-4 py-2 text-sm text-[var(--ink-soft)] disabled:opacity-40" disabled={step === 0}>Back</button>
        <span className="text-xs text-[var(--ink-faint)]">{progress}% shaped</span>
        {step < totalSteps - 1 && <button type="button" onClick={() => setStep((value) => Math.min(totalSteps - 1, value + 1))} className="rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white">{step < 2 ? 'Continue' : 'Next question'}</button>}
      </div>
    </form>
  );
}
