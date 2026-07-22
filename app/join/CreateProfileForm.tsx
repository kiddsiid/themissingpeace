'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { signUpWithPassword } from '@/lib/auth/actions';
import type { AuthState } from '@/lib/auth/types';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-full bg-[var(--clay)] px-6 py-3 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? 'Opening the door…' : 'Create my profile'}
    </button>
  );
}

// Step 2 of the flow: "Create profile" — the Supabase Auth sign-up. On success the
// server action bootstraps the workspace (from the welcome cookie) and routes into
// the Dream Walk. Google / Apple are shown as coming soon.
export function CreateProfileForm() {
  const [state, formAction] = useActionState<AuthState, FormData>(signUpWithPassword, {});

  if (state.check) {
    return (
      <div className="text-center">
        <h1 className="voice text-4xl text-[var(--ink)]">Check your email</h1>
        <p className="mt-3 text-sm text-[var(--ink-soft)]">
          We sent a confirmation link. Open it and you&apos;ll step straight into your Dream Walk.
        </p>
        <Link href="/sign-in" className="mt-6 inline-block text-sm text-[var(--clay-ink)] underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center">
      <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-faint)]">Create your profile</p>
      <h1 className="voice mt-3 text-4xl leading-tight text-[var(--ink)]">Hold your place in the Dream</h1>
      <p className="mt-3 text-sm text-[var(--ink-soft)]">
        Your own login — so you, your partner, and anyone you invite each have a seat.
      </p>

      <div className="mt-7 grid grid-cols-2 gap-2">
        {['Google', 'Apple'].map((p) => (
          <button
            key={p}
            type="button"
            disabled
            title="Coming soon"
            className="cursor-not-allowed rounded-2xl border border-[#E4D8C0] bg-white/50 px-4 py-3 text-sm text-[var(--ink-faint)]"
          >
            {p} · soon
          </button>
        ))}
      </div>

      <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">
        <span className="h-px flex-1 bg-[var(--line)]" /> or <span className="h-px flex-1 bg-[var(--line)]" />
      </div>

      <form action={formAction} className="space-y-3 text-left">
        <input
          name="name"
          placeholder="Your name"
          autoComplete="name"
          className="w-full rounded-xl border border-[#D8C7A6] bg-white/80 px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--clay)]"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="you@email.com"
          autoComplete="email"
          className="w-full rounded-xl border border-[#D8C7A6] bg-white/80 px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--clay)]"
        />
        <input
          name="password"
          type="password"
          required
          minLength={8}
          placeholder="Create a password (8+ characters)"
          autoComplete="new-password"
          className="w-full rounded-xl border border-[#D8C7A6] bg-white/80 px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--clay)]"
        />
        {state.error ? <p className="text-sm text-[#B4472F]">{state.error}</p> : null}
        <SubmitButton />
      </form>

      <p className="mt-5 text-sm text-[var(--ink-soft)]">
        Already have a Dream?{' '}
        <Link href="/sign-in" className="text-[var(--clay-ink)] underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
