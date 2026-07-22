// End-to-end RLS proof over PostgREST using REAL Clerk-issued tokens.
//
// This complements `supabase/tests/rls_proof.sql`, which proves the policy logic
// deterministically at the database layer. This test proves the *full* path:
//   Clerk JWT -> Supabase third-party auth -> auth.jwt() -> auth_workspace_ids() -> RLS
//
// PREREQUISITES (owner, one-time — see docs/phase-1/01-rls-proof.md):
//   1. Clerk: enable the Supabase integration (JWT `sub` = Clerk user id).
//   2. Supabase: Authentication -> Third-party auth -> add Clerk.
//   3. Migrations 0001..0003 and 0015 applied.
//
// RUN (against a NON-PRODUCTION / staging project only):
//   RLS_LIVE=1 \
//   SUPABASE_URL=... SUPABASE_ANON_KEY=... \
//   RLS_TOKEN_A=<clerk jwt, user A> RLS_WS_A=<workspace uuid A> \
//   RLS_TOKEN_B=<clerk jwt, user B> RLS_WS_B=<workspace uuid B> \
//   pnpm vitest run tests/integration/rls-isolation.test.ts
//
// Without RLS_LIVE=1 the suite is skipped, so it never breaks normal `pnpm test`.

import { describe, it, expect } from 'vitest';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const live = process.env.RLS_LIVE === '1';
const url = process.env.SUPABASE_URL ?? '';
const anon = process.env.SUPABASE_ANON_KEY ?? '';
const tokenA = process.env.RLS_TOKEN_A ?? '';
const tokenB = process.env.RLS_TOKEN_B ?? '';
const wsA = process.env.RLS_WS_A ?? '';
const wsB = process.env.RLS_WS_B ?? '';

// Guard: never let this run against the production project by accident.
if (live && /ztgixihhivtharrelmps/.test(url)) {
  throw new Error('Refusing to run the RLS integration test against the production Supabase project. Use a staging project.');
}

const clientFor = (token: string): SupabaseClient =>
  createClient(url, anon, { auth: { persistSession: false }, accessToken: async () => token });

const CORE_TABLES = ['board_items', 'budget_items', 'decisions', 'guests'] as const;

describe.skipIf(!live)('RLS isolation over PostgREST (real Clerk tokens)', () => {
  it('A cannot READ any of B\'s rows across core tables', async () => {
    const a = clientFor(tokenA);
    for (const table of CORE_TABLES) {
      const { data, error } = await a.from(table).select('id').eq('workspace_id', wsB);
      expect(error, `${table}: query errored`).toBeNull();
      expect(data ?? [], `${table}: A saw B's rows`).toHaveLength(0);
    }
  });

  it('A cannot WRITE into B\'s workspace', async () => {
    const a = clientFor(tokenA);
    const { error } = await a
      .from('decisions')
      .insert({ workspace_id: wsB, title: 'injected by A', category: 'budget', status: 'open' });
    expect(error, 'insert into B must be denied by RLS').not.toBeNull();
  });

  it('B cannot see A\'s private Peace Notes', async () => {
    const b = clientFor(tokenB);
    const { data } = await b.from('peace_notes').select('id').eq('workspace_id', wsA);
    expect(data ?? [], 'B saw A\'s peace notes').toHaveLength(0);
  });

  it('sanity: A can read its OWN workspace', async () => {
    const a = clientFor(tokenA);
    const { error } = await a.from('decisions').select('id').eq('workspace_id', wsA);
    expect(error, 'A should be able to read its own workspace').toBeNull();
  });
});
