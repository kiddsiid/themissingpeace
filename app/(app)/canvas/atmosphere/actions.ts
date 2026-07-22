'use server';

import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { loadCanvasBoard, saveCanvasBoard } from '@/lib/canvas/store';
import { requireActiveWorkspace } from '@/lib/workspace/current';

// Palette changes the Atmosphere Lab can persist. Roles and journey are not
// edited on this screen, so we only patch name / colors / atmosphere — matching
// the prototype's `persist()`.
export interface PalettePatch {
  name?: string;
  colors?: string[];
  atmosphere?: string[];
}

async function requireAtmosphereWrite() {
  const workspace = await requireActiveWorkspace();
  if (!can(workspace.role, 'plan.full')) {
    throw new Error('You do not have permission to edit the Atmosphere Lab');
  }
  return workspace;
}

function sanitizePatch(patch: PalettePatch): PalettePatch {
  const out: PalettePatch = {};
  if (typeof patch.name === 'string') out.name = patch.name.trim().slice(0, 80) || 'Untitled palette';
  if (Array.isArray(patch.colors)) {
    out.colors = patch.colors
      .filter((c): c is string => typeof c === 'string')
      .slice(0, 5);
  }
  if (Array.isArray(patch.atmosphere)) {
    out.atmosphere = patch.atmosphere
      .filter((w): w is string => typeof w === 'string')
      .slice(0, 24);
  }
  return out;
}

/**
 * Persist a palette change (load → mutate → save). No-ops gracefully if the
 * caller lacks write access is handled by the guard; a not-yet-migrated table
 * is tolerated inside `saveCanvasBoard`.
 */
export async function savePalette(patch: PalettePatch): Promise<{ ok: true }> {
  const workspace = await requireAtmosphereWrite();
  const clean = sanitizePatch(patch);

  const { board } = await loadCanvasBoard(workspace.id);
  if (clean.name !== undefined) board.palette.name = clean.name;
  if (clean.colors && clean.colors.length) board.palette.colors = clean.colors;
  if (clean.atmosphere) board.palette.atmosphere = clean.atmosphere;

  await saveCanvasBoard(workspace.id, board);
  revalidatePath('/canvas/atmosphere');
  return { ok: true };
}

/**
 * Persist the chosen light direction. `wedding.light` lives in the shared
 * context, so we rewrite the full context object (weddingPalette preserved) to
 * avoid clobbering it — `saveCanvasBoard` replaces `context_json` wholesale.
 */
export async function saveLight(light: string): Promise<{ ok: true }> {
  const workspace = await requireAtmosphereWrite();
  const value = typeof light === 'string' ? light.slice(0, 40) : '';
  if (!value) throw new Error('A light direction is required');

  const { board, context } = await loadCanvasBoard(workspace.id);
  await saveCanvasBoard(workspace.id, board, { ...context, light: value });
  revalidatePath('/canvas/atmosphere');
  return { ok: true };
}

/**
 * "Ripple through the world" — persist the palette and flag the wedding palette
 * as aligned (`weddingPalette === board.palette.name`). Revalidates the hub so
 * the Atmosphere room ring turns aligned.
 */
export async function ripplePalette(patch: PalettePatch): Promise<{ ok: true; palette: string }> {
  const workspace = await requireAtmosphereWrite();
  const clean = sanitizePatch(patch);

  const { board, context } = await loadCanvasBoard(workspace.id);
  if (clean.name !== undefined) board.palette.name = clean.name;
  if (clean.colors && clean.colors.length) board.palette.colors = clean.colors;
  if (clean.atmosphere) board.palette.atmosphere = clean.atmosphere;

  await saveCanvasBoard(workspace.id, board, { ...context, weddingPalette: board.palette.name });
  revalidatePath('/canvas/atmosphere');
  revalidatePath('/canvas');
  return { ok: true, palette: board.palette.name };
}
