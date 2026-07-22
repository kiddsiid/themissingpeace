'use client';
// Route-group error boundary for the authenticated app shell (T3).
// Next.js renders this when a route segment under app/(app) throws during
// render/data-fetch, instead of white-screening. It stays inside the shell.
import * as React from 'react';
import { Button, Card } from '@/design-system';
import { track } from '@/lib/analytics';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Coarse, non-identifying: the digest is a hashed id, never the message/stack.
    track('error_encountered', { scope: 'app-route', code: error.digest }, { surface: 'web' });
  }, [error]);

  return (
    <main role="main" aria-labelledby="app-error-title" className="mx-auto max-w-md px-4 py-16">
      <Card elevation="raised" className="p-6 text-center">
        <p className="text-[10px] uppercase tracking-[0.15em] text-[var(--ink-faint)]">Something interrupted this page</p>
        <h1 id="app-error-title" className="voice mt-1 text-2xl text-[var(--ink)]">
          A small hiccup — nothing is lost
        </h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">
          This part of your workspace didn&apos;t load. Your saved work is safe. You can try again, and
          if it keeps happening, refreshing usually clears it.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2">
          <Button variant="primary" onClick={() => reset()}>
            Try again
          </Button>
          <Button variant="secondary" onClick={() => { if (typeof window !== 'undefined') window.location.reload(); }}>
            Refresh
          </Button>
        </div>
        {error.digest && (
          <p className="mt-4 text-[11px] text-[var(--ink-faint)]">Reference: {error.digest}</p>
        )}
      </Card>
    </main>
  );
}
