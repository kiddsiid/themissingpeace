// Persistence for the Living Canvas board slice.
//
// The board slice (food / palette / attire / inspirations) is stored as JSON in
// a single `canvas_state` row per workspace. This mirrors the prototype's single
// `board` object while using the app's Supabase layer instead of localStorage.
//
// Follows the repo convention (see budget/actions.ts `insertOptional`) of
// tolerating a not-yet-migrated table: if `canvas_state` is missing, reads fall
// back to the seed and writes no-op, so the UI keeps working before the
// migration is applied.

import { supabaseAdmin } from '@/lib/supabase/admin';
import { CANVAS_SEED, SEED_WEDDING_CONTEXT } from './seed';
import type { CanvasBoard, CanvasContext } from './types';

const MISSING_TABLE = ['42P01', 'PGRST205', 'PGRST116'];

function isMissingTable(code?: string | null) {
  return !!code && MISSING_TABLE.includes(code);
}

/** Deep clone so callers can freely mutate the returned board. */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function seedBoard(): CanvasBoard {
  return clone(CANVAS_SEED);
}

export interface CanvasLoad {
  board: CanvasBoard;
  context: CanvasContext;
}

/**
 * Load the board slice for a workspace, hydrating from the seed when absent.
 * `context` blends the workspace profile (project name, wedding light/season,
 * palette-name, member roles) with sane seed defaults.
 */
export async function loadCanvasBoard(
  workspaceId: string,
  contextOverrides: Partial<CanvasContext> = {},
): Promise<CanvasLoad> {
  const db = supabaseAdmin();

  let stored: CanvasBoard | null = null;
  let storedContext: Partial<CanvasContext> = {};
  try {
    const { data, error } = await db
      .from('canvas_state')
      .select('board_json, context_json')
      .eq('workspace_id', workspaceId)
      .maybeSingle();
    if (error && !isMissingTable(error.code)) throw error;
    if (data?.board_json) stored = data.board_json as CanvasBoard;
    if (data?.context_json) storedContext = data.context_json as Partial<CanvasContext>;
  } catch (err: unknown) {
    // Only swallow the missing-table case; surface anything else.
    const code = (err as { code?: string })?.code;
    if (!isMissingTable(code)) throw err;
  }

  const board = stored ? healBoard(stored) : seedBoard();

  const context: CanvasContext = {
    projectName: 'Maya & Julian · June 2027',
    compassSentence: SEED_WEDDING_CONTEXT.compassSentence,
    season: SEED_WEDDING_CONTEXT.season,
    light: SEED_WEDDING_CONTEXT.light,
    weddingPalette: SEED_WEDDING_CONTEXT.weddingPalette,
    approverRoles: ['Maya', 'Julian', 'Aria'],
    ...storedContext,
    ...contextOverrides,
  };

  return { board, context };
}

/** Fill any branches an older stored board is missing (matches wedding-state heal). */
function healBoard(stored: CanvasBoard): CanvasBoard {
  const base = seedBoard();
  const board = clone(stored);
  if (!board.food || !board.food.identity) board.food = base.food;
  if (!board.palette) board.palette = base.palette;
  else {
    if (!board.palette.colors) board.palette.colors = base.palette.colors;
    if (!board.palette.name) board.palette.name = base.palette.name;
    if (!board.palette.roles) board.palette.roles = base.palette.roles;
    if (!board.palette.atmosphere) board.palette.atmosphere = base.palette.atmosphere;
    if (!board.palette.journey) board.palette.journey = base.palette.journey;
  }
  if (!board.attire) board.attire = base.attire;
  else {
    if (!board.attire.looks) board.attire.looks = base.attire.looks;
    if (!board.attire.dressCode) board.attire.dressCode = base.attire.dressCode;
    if (!board.attire.rules) board.attire.rules = base.attire.rules;
  }
  if (!board.inspirations) board.inspirations = base.inspirations;
  return board;
}

/**
 * Persist the full board slice. Optionally patch the stored context (e.g. when
 * Atmosphere "ripples" and sets wedding.palette). No-ops gracefully if the
 * table has not been migrated yet.
 */
export async function saveCanvasBoard(
  workspaceId: string,
  board: CanvasBoard,
  contextPatch?: Partial<CanvasContext>,
): Promise<void> {
  const db = supabaseAdmin();
  const payload: Record<string, unknown> = {
    workspace_id: workspaceId,
    board_json: board,
    updated_at: new Date().toISOString(),
  };
  if (contextPatch) payload.context_json = contextPatch;

  const { error } = await db.from('canvas_state').upsert(payload, { onConflict: 'workspace_id' });
  if (error && !isMissingTable(error.code)) throw error;
}
