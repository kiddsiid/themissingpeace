'use client';

import { useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import Link from 'next/link';
import { signInWithPassword } from '@/lib/auth/actions';
import type { AuthState } from '@/lib/auth/types';

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-full bg-[var(--clay)] px-6 py-3 text-sm text-white transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? 'Welcoming you back…' : 'Return to your Dream'}
    </button>
  );
}

export function SignInForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction] = useActionState<AuthState, FormData>(signInWithPassword, {});

  return (
    <div className="text-center">
      <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--ink-faint)]">Welcome back</p>
      <h1 className="voice mt-3 text-4xl leading-tight text-[var(--ink)]">Where forever continues</h1>
      <p className="mt-3 text-sm text-[var(--ink-soft)]">Sign in to step back into your plan.</p>

      <form action={formAction} className="mt-7 space-y-3 text-left">
        <input type="hidden" name="redirect" value={redirectTo ?? ''} />
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
          placeholder="Your password"
          autoComplete="current-password"
          className="w-full rounded-xl border border-[#D8C7A6] bg-white/80 px-4 py-3 text-sm text-[var(--ink)] outline-none focus:border-[var(--clay)]"
        />
        {state.error ? <p className="text-sm text-[#B4472F]">{state.error}</p> : null}
        <SubmitButton />
      </form>

      <p className="mt-5 text-sm text-[var(--ink-soft)]">
        New here?{' '}
        <Link href="/welcome" className="text-[var(--clay-ink)] underline">
          Begin your Dream
        </Link>
      </p>
    </div>
  );
}
