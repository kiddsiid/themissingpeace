// Ripple layer (Phase 2, P4). A ripple records that a change happened and which areas
// it touches, so the UI can show consequence ("approving the venue affects budget,
// seating, and the timeline") and the `ripple_viewed` analytics event has a target.
//
// `deriveRippleImpact` is pure + unit-tested. `emitRipple` is resilient: it never throws
// (a ripple must not break the mutation that triggered it) and no-ops if the table has
// not been migrated yet — the same tolerance pattern as the canvas store.

import { supabaseAdmin } from '@/lib/supabase/admin';

export type RippleSourceType =
  | 'decision' | 'budget_item' | 'vendor' | 'guest_count' | 'compass' | 'task' | 'board_item';

export interface RippleImpact {
  area: string;                         // affected module, e.g. 'budget' | 'seating'
  note: string;
  severity?: 'low' | 'med' | 'high';
}

export interface RippleInput {
  sourceType: RippleSourceType;
  changeKind: string;                   // 'approved' | 'updated' | 'status_changed' | ...
  /** decision/vendor category, when relevant, to sharpen the impact set. */
  category?: string;
  summary?: string;
}

// Which areas a settled decision ripples into, keyed by decision category.
const DECISION_AREAS: Record<string, RippleImpact[]> = {
  budget: [{ area: 'budget', note: 'Committed spend may shift.' }, { area: 'timeline', note: 'Payment milestones may move.' }],
  guest: [{ area: 'guests', note: 'Guest list affected.' }, { area: 'seating', note: 'Seating may need rework.', severity: 'med' }, { area: 'budget', note: 'Per-guest costs shift.' }],
  vendor: [{ area: 'vendors', note: 'Vendor plan affected.' }, { area: 'budget', note: 'Quote/commitment changes.' }, { area: 'timeline', note: 'Booking timeline affected.' }],
  venue: [{ area: 'budget', note: 'Largest line item set.', severity: 'high' }, { area: 'seating', note: 'Floor plan depends on venue.' }, { area: 'timeline', note: 'Date/venue anchors the plan.' }, { area: 'vendors', note: 'Some vendors are venue-specific.' }],
  menu: [{ area: 'budget', note: 'Catering cost shifts.' }, { area: 'canvas', note: 'Feast board affected.' }],
  attire: [{ area: 'canvas', note: 'Atelier looks affected.' }],
  design: [{ area: 'canvas', note: 'Atmosphere/palette affected.' }],
  timeline: [{ area: 'timeline', note: 'Schedule affected.' }],
  family: [{ area: 'guests', note: 'Guest/family dynamics.' }, { area: 'seating', note: 'Seating sensitivities.' }],
  cultural_religious: [{ area: 'canvas', note: 'Ceremony/feast traditions.' }, { area: 'decisions', note: 'Related decisions may follow.' }],
  honeymoon: [{ area: 'honeymoon', note: 'Honeymoon plan affected.' }, { area: 'budget', note: 'Honeymoon spend shifts.' }],
};

/** Pure: the areas a change ripples into. Always returns at least one impact. */
export function deriveRippleImpact(input: RippleInput): RippleImpact[] {
  switch (input.sourceType) {
    case 'decision':
      return DECISION_AREAS[input.category ?? ''] ?? [{ area: 'decisions', note: 'A decision was settled.' }];
    case 'budget_item':
      return [{ area: 'budget', note: 'Budget totals updated.' }, { area: 'timeline', note: 'Payment schedule may shift.' }];
    case 'vendor':
      return [{ area: 'vendors', note: 'Vendor status changed.' }, { area: 'budget', note: 'Commitment/quote affected.' }, { area: 'timeline', note: 'Booking timeline affected.' }];
    case 'guest_count':
      return [{ area: 'budget', note: 'Per-guest costs recompute.', severity: 'med' }, { area: 'seating', note: 'Seating capacity affected.' }, { area: 'canvas', note: 'Feast counts affected.' }, { area: 'guests', note: 'Guest planning affected.' }];
    case 'compass':
      return [{ area: 'dream', note: 'Your Compass changed.', severity: 'med' }, { area: 'decisions', note: 'Priorities may re-weight.' }, { area: 'canvas', note: 'Creative direction may shift.' }];
    case 'task':
      return [{ area: 'timeline', note: 'Task status changed.' }];
    case 'board_item':
      return [{ area: 'canvas', note: 'Board item changed.' }];
    default:
      return [{ area: 'decisions', note: 'Something changed.' }];
  }
}

const MISSING_TABLE = ['42P01', 'PGRST205', 'PGRST116'];

/**
 * Persist a ripple. Never throws; no-ops if ripple_events is not migrated yet.
 * Returns the created row id, or null if it was skipped/failed.
 */
export async function emitRipple(
  workspaceId: string,
  input: RippleInput & { sourceId?: string | null; originRunId?: string | null; createdBy?: string | null },
): Promise<string | null> {
  try {
    const impact = deriveRippleImpact(input);
    const { data, error } = await supabaseAdmin()
      .from('ripple_events')
      .insert({
        workspace_id: workspaceId,
        source_type: input.sourceType,
        source_id: input.sourceId ?? null,
        change_kind: input.changeKind,
        summary: input.summary ?? null,
        impact_json: impact,
        origin_run_id: input.originRunId ?? null,
        created_by: input.createdBy ?? null,
      })
      .select('id')
      .single();
    if (error) {
      if (!MISSING_TABLE.includes(error.code ?? '')) {
        // Log-and-swallow: a ripple must never break the triggering mutation.
        console.error('[ripple] emit failed', error.code);
      }
      return null;
    }
    return (data?.id as string) ?? null;
  } catch {
    return null;
  }
}
