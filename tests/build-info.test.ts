import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { buildInfo } from '../src/lib/build/info';

// The build stamp is what §26.1(3) reads to confirm a deploy landed. If it can
// silently report a plausible-looking commit it never built from, the gate is
// worthless — so the interesting cases here are the missing ones.

const KEYS = ['NEXT_PUBLIC_BUILD_SHA', 'NEXT_PUBLIC_BUILD_BRANCH', 'NEXT_PUBLIC_BUILD_TIME'] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe('build stamp', () => {
  it('reports the injected commit, branch and build time', () => {
    process.env.NEXT_PUBLIC_BUILD_SHA = '65af9c1c18f5e31ba1e6ad3361cdaef3e5d3d62e';
    process.env.NEXT_PUBLIC_BUILD_BRANCH = 'codex/update-prototype-from-zip';
    process.env.NEXT_PUBLIC_BUILD_TIME = '2026-07-25T21:00:00.000Z';

    const info = buildInfo();
    expect(info.sha).toBe('65af9c1c18f5e31ba1e6ad3361cdaef3e5d3d62e');
    expect(info.shortSha).toBe('65af9c1');
    expect(info.branch).toBe('codex/update-prototype-from-zip');
    expect(info.builtAt).toBe('2026-07-25T21:00:00.000Z');
    expect(info.known).toBe(true);
  });

  it('says unknown rather than guessing when the commit is absent', () => {
    delete process.env.NEXT_PUBLIC_BUILD_SHA;
    delete process.env.NEXT_PUBLIC_BUILD_BRANCH;
    delete process.env.NEXT_PUBLIC_BUILD_TIME;

    const info = buildInfo();
    expect(info.sha).toBe('unknown');
    expect(info.shortSha).toBe('unknown');
    expect(info.branch).toBe('unknown');
    expect(info.builtAt).toBe('unknown');
    expect(info.known).toBe(false);
  });

  it('never truncates the unknown marker into something that reads like a SHA', () => {
    delete process.env.NEXT_PUBLIC_BUILD_SHA;
    expect(buildInfo().shortSha).not.toMatch(/^[0-9a-f]{7}$/);
  });
});
