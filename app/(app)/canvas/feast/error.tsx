'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/design-system';
import { track } from '@/lib/analytics';

export default function FeastError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    track('error_encountered', { scope: 'feast_load', code: error.digest ? 'server_render' : 'unknown' });
  }, [error.digest]);

  return (
    <main className="mx-auto grid min-h-[70vh] max-w-2xl place-items-center px-5 text-center">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-[#7A531A]">The plan is still protected</p>
        <h1 className="voice mt-2 text-4xl">Feast Studio could not refresh.</h1>
        <p className="mt-3 text-sm leading-6 text-[#6D645B]">
          Existing database and device drafts have not been discarded. Retry the shared plan, or return to the Living Canvas while the connection recovers.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Button onClick={reset}>Retry Feast Studio</Button>
          <Link href="/canvas" className="inline-flex min-h-10 items-center rounded-[10px] border border-[rgba(32,28,24,.14)] px-4 text-sm font-semibold">
            Return to Living Canvas
          </Link>
        </div>
      </div>
    </main>
  );
}
