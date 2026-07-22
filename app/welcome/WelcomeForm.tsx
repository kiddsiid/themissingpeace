'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { saveWelcome } from '@/lib/auth/actions';

type Role = 'couple' | 'planner';

// "Tell us about you" — the first doorway. Collected before the account exists and
// stashed (server action -> short-lived cookie) so the Create-profile step can name
// the workspace and seed partner labels the moment the profile is made.
export function WelcomeForm() {
  const [role, setRole] = useState<Role>('couple');
  const [p1, setP1] = useState('');
  const [p2, setP2] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');

  const suggested =
    p1 && p2 ? `${p1} & ${p2}` : p1 ? `${p1}'s Wedding` : 'Our Wedding';

  return (
    <form action={saveWelcome} className="text-center">
      <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-faint)]">Tell us about you</p>
      <h1 className="voice mt-3 text-4xl leading-tight text-[var(--ink)]">Who&apos;s dreaming?</h1>
      <p className="mt-3 text-sm text-[var(--ink-soft)]">
        A few names so the whole plan speaks to you. You can change any of this later.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-2">
        {(['couple', 'planner'] as Role[]).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={
              'motion-lift rounded-2xl border px-4 py-3 text-sm transition ' +
              (role === r
                ? 'border-[var(--clay)] bg-[var(--clay-bg)] text-[var(--clay-ink)]'
                : 'border-[#D8C7A6] bg-white/70 text-[var(--ink-soft)]')
            }
          >
            {r === 'couple' ? 'We’re the couple' : 'I’m a planner'}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3 text-left">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-faint)]">
            {role === 'planner' ? 'Partner one' : 'Your name'}
          </span>
          <input
            value={p1}
            onChange={(e) => setP1(e.target.value)}
            placeholder="e.g. Amara"
            className="mt-1 w-full rounded-xl border border-[#D8C7A6] bg-white/80 px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--clay)]"
          />
        </label>
        <AnimatePresence initial={false}>
          <motion.label
            key="p2"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="block overflow-hidden"
          >
            <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-faint)]">
              {role === 'planner' ? 'Partner two' : 'Your partner'}
            </span>
            <input
              value={p2}
              onChange={(e) => setP2(e.target.value)}
              placeholder="e.g. Noah"
              className="mt-1 w-full rounded-xl border border-[#D8C7A6] bg-white/80 px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--clay)]"
            />
          </motion.label>
        </AnimatePresence>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.18em] text-[var(--ink-faint)]">Name this wedding</span>
          <input
            value={workspaceName}
            onChange={(e) => setWorkspaceName(e.target.value)}
            placeholder={suggested}
            className="mt-1 w-full rounded-xl border border-[#D8C7A6] bg-white/80 px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--clay)]"
          />
        </label>
      </div>

      <input type="hidden" name="creatorRole" value={role} />
      <input type="hidden" name="partnerOneLabel" value={p1} />
      <input type="hidden" name="partnerTwoLabel" value={p2} />
      <input type="hidden" name="workspaceName" value={workspaceName || suggested} />

      <button
        type="submit"
        className="mt-8 w-full rounded-full bg-[var(--clay)] px-6 py-3 text-sm text-white transition hover:opacity-90"
      >
        Continue
      </button>
      <p className="mt-4 text-[11px] text-[var(--gold)]">Free to dream. Invite your person anytime.</p>
    </form>
  );
}
