import { NextResponse } from 'next/server';

import { buildInfo } from '@/lib/build/info';

// The machine-readable half of the build stamp (One-Engine §26.3). Public by
// owner decision, 2026-07-25: a deploy has to be verifiable without a login.
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json(
    { app: 'the-missing-peace', ...buildInfo(), checkedAt: new Date().toISOString() },
    { headers: { 'cache-control': 'no-store' } },
  );
}
