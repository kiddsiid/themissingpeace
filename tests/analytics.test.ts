import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { track, isAnalyticsEnabled, setAnalyticsSink, type AnalyticsPayload } from '@/lib/analytics';

// T4 acceptance: the emitter is callable, no-ops safely when disabled, only emits
// coarse (non-PII) events when explicitly enabled, and never throws.

const captured: AnalyticsPayload[] = [];
const prevEnv = process.env.ANALYTICS_ENABLED;

beforeEach(() => {
  captured.length = 0;
  setAnalyticsSink({ send: (p) => { captured.push(p); } });
});
afterEach(() => {
  setAnalyticsSink(null);
  if (prevEnv === undefined) delete process.env.ANALYTICS_ENABLED;
  else process.env.ANALYTICS_ENABLED = prevEnv;
});

describe('analytics emitter', () => {
  it('is disabled (no-op) by default', () => {
    delete process.env.ANALYTICS_ENABLED;
    expect(isAnalyticsEnabled()).toBe(false);
    track('workspace_created', { source: 'onboarding' }, { workspaceId: 'ws1' });
    expect(captured).toHaveLength(0);
  });

  it('emits a well-formed payload when explicitly enabled', () => {
    process.env.ANALYTICS_ENABLED = '1';
    expect(isAnalyticsEnabled()).toBe(true);
    track('workspace_created', { source: 'onboarding' }, { workspaceId: 'ws1', userId: 'u1', surface: 'server' });
    expect(captured).toHaveLength(1);
    const p = captured[0];
    expect(p.event).toBe('workspace_created');
    expect(p.props).toEqual({ source: 'onboarding' });
    expect(p.context.workspaceId).toBe('ws1');
    expect(p.context.surface).toBe('server');
    expect(typeof p.ts).toBe('string');
  });

  it('scrubs identifying-looking keys and non-scalar values', () => {
    process.env.ANALYTICS_ENABLED = 'true';
    // @ts-expect-error — deliberately passing keys outside the typed shape
    track('decision_created', { category: 'budget', email: 'a@b.com', partnerName: 'Maya', blob: { x: 1 } }, {});
    expect(captured).toHaveLength(1);
    expect(captured[0].props).toEqual({ category: 'budget' });
  });

  it('ignores unknown event names', () => {
    process.env.ANALYTICS_ENABLED = '1';
    // @ts-expect-error — not a member of the taxonomy
    track('totally_made_up_event', {}, {});
    expect(captured).toHaveLength(0);
  });

  it('never throws even if the sink explodes', () => {
    process.env.ANALYTICS_ENABLED = '1';
    setAnalyticsSink({ send: () => { throw new Error('sink boom'); } });
    expect(() => track('mobile_nav_used', { module: 'canvas' }, {})).not.toThrow();
  });
});
