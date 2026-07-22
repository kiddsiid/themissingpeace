// Privacy-conscious analytics emitter (Phase 1, T4) — STUBBED.
//
// Contract:
//  - `track()` NEVER throws and NEVER blocks a product flow. Analytics failures
//    are swallowed; the app must behave identically whether or not a sink exists.
//  - No-ops entirely unless explicitly enabled (opt-in), so nothing is collected
//    by default. There is NO behavioral tracking, no heatmaps, no session replay —
//    only the discrete, named product events in events.ts, with coarse properties.
//  - A runtime guard drops any property key that looks identifying (name / email /
//    phone / body / token), as defense-in-depth against accidental PII.
//
// Wiring a real provider later means implementing one `AnalyticsSink` and passing
// it to `setAnalyticsSink()` (e.g. from instrumentation). Until then the default
// sink logs to the console in dev and is silent in production.

import {
  ANALYTICS_EVENTS,
  type AnalyticsEvent,
  type AnalyticsContext,
  type EventProps,
} from './events';

export interface AnalyticsPayload {
  event: AnalyticsEvent;
  props: Record<string, unknown>;
  context: AnalyticsContext;
  ts: string; // ISO timestamp, set at emit time
}

export interface AnalyticsSink {
  send(payload: AnalyticsPayload): void | Promise<void>;
}

const EVENT_SET = new Set<string>(ANALYTICS_EVENTS);

// Keys we refuse to forward even if a caller mistakenly includes them.
const PII_KEY = /(name|email|phone|body|content|reflection|token|secret|address|dob|ssn)/i;

let sink: AnalyticsSink | null = null;

/** Install the real provider sink (from server instrumentation or a client boot). */
export function setAnalyticsSink(next: AnalyticsSink | null): void {
  sink = next;
}

/** Opt-in: analytics is OFF unless one of these env flags is a truthy "1"/"true". */
export function isAnalyticsEnabled(): boolean {
  const flags = [
    typeof process !== 'undefined' ? process.env?.ANALYTICS_ENABLED : undefined,
    typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_ANALYTICS_ENABLED : undefined,
  ];
  return flags.some((v) => v === '1' || v === 'true');
}

function scrub(props: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(props)) {
    if (PII_KEY.test(k)) continue;                 // drop identifying-looking keys
    if (v == null) continue;
    const t = typeof v;
    if (t === 'string' || t === 'number' || t === 'boolean') out[k] = v; // scalars only
  }
  return out;
}

function isoNow(): string {
  try {
    return new Date().toISOString();
  } catch {
    return '';
  }
}

/**
 * Emit a product analytics event. Type-safe: `props` is checked against the
 * event's shape in events.ts. Safe to call from server actions or the client.
 */
export function track<E extends AnalyticsEvent>(
  event: E,
  props: EventProps[E] = {} as EventProps[E],
  context: AnalyticsContext = {},
): void {
  try {
    if (!isAnalyticsEnabled()) return;
    if (!EVENT_SET.has(event)) return; // unknown event name — ignore rather than emit garbage
    const payload: AnalyticsPayload = {
      event,
      props: scrub(props as Record<string, unknown>),
      context: {
        workspaceId: context.workspaceId,
        userId: context.userId,
        surface: context.surface ?? (typeof window === 'undefined' ? 'server' : 'web'),
      },
      ts: isoNow(),
    };
    if (sink) {
      // Never let a sink rejection surface into the caller.
      Promise.resolve(sink.send(payload)).catch(() => {});
    } else if (process.env?.NODE_ENV !== 'production') {
      // Dev visibility until a real sink is wired.
      // eslint-disable-next-line no-console
      console.debug('[analytics]', payload.event, payload.props, payload.context);
    }
  } catch {
    // Analytics must never break a flow.
  }
}
