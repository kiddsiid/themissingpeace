'use server';

import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { loadCanvasBoard, saveCanvasBoard } from '@/lib/canvas/store';
import { requireActiveWorkspace } from '@/lib/workspace/current';
import { supabaseAdmin } from '@/lib/supabase/admin';
import {
  ATMOSPHERE_SURFACES,
  derivePaletteRipple,
  surfaceTargetColor,
  type Palette,
  type Surface,
  type SurfaceUpdate,
} from '@/lib/engine/atmosphere';
import { emitRipple } from '@/lib/engine/ripple';

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

function planPalette(colors: string[]): Palette {
  return {
    primary: colors[0] || '#8A9A80',
    secondary: colors[1] || colors[0] || '#BC7459',
    accent: colors[2] || colors[1] || colors[0] || '#E7D2C8',
    neutrals: [colors[3] || '#F1EBDD', colors[4] || '#3A3631'],
  };
}

function seedSurfaces(palette: Palette): Surface[] {
  return ATMOSPHERE_SURFACES.map((surface) => ({
    surface,
    applied: false,
    override: false,
    color: surfaceTargetColor(surface, palette),
  }));
}

async function saveWorldPlan(
  workspaceId: string,
  userId: string,
  palette: Palette,
  surfaces?: Surface[],
) {
  const db = supabaseAdmin();
  const { data: current } = await db
    .from('atmosphere_plans')
    .select('surfaces_json, version')
    .eq('workspace_id', workspaceId)
    .maybeSingle();
  const nextSurfaces = surfaces ?? ((current?.surfaces_json as Surface[] | null) || seedSurfaces(palette));
  const { error } = await db.from('atmosphere_plans').upsert({
    workspace_id: workspaceId,
    palette_json: palette,
    surfaces_json: nextSurfaces,
    updated_by: userId,
    updated_at: new Date().toISOString(),
    version: Number(current?.version ?? 0) + 1,
  }, { onConflict: 'workspace_id' });
  if (error) throw error;
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
  await saveWorldPlan(workspace.id, workspace.userId, planPalette(board.palette.colors));
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
export async function ripplePalette(patch: PalettePatch): Promise<{ ok: true; palette: string; updates: SurfaceUpdate[] }> {
  const workspace = await requireAtmosphereWrite();
  const clean = sanitizePatch(patch);

  const { board, context } = await loadCanvasBoard(workspace.id);
  if (clean.name !== undefined) board.palette.name = clean.name;
  if (clean.colors && clean.colors.length) board.palette.colors = clean.colors;
  if (clean.atmosphere) board.palette.atmosphere = clean.atmosphere;

  const nextPalette = planPalette(board.palette.colors);
  const db = supabaseAdmin();
  const { data: current } = await db
    .from('atmosphere_plans')
    .select('surfaces_json')
    .eq('workspace_id', workspace.id)
    .maybeSingle();
  const currentSurfaces = ((current?.surfaces_json as Surface[] | null) || seedSurfaces(nextPalette));
  const updates = derivePaletteRipple(nextPalette, currentSurfaces);
  const byName = new Map(currentSurfaces.map((surface) => [surface.surface, surface]));
  const applied = ATMOSPHERE_SURFACES.map((surface) => {
    const before = byName.get(surface) ?? { surface, applied: false, override: false };
    const update = updates.find((entry) => entry.surface === surface);
    if (!update || update.status === 'override_kept') return before;
    return { ...before, applied: true, color: update.to };
  });

  await saveCanvasBoard(workspace.id, board, { ...context, weddingPalette: board.palette.name });
  await saveWorldPlan(workspace.id, workspace.userId, nextPalette, applied);
  await emitRipple(workspace.id, {
    sourceType: 'compass',
    changeKind: 'updated',
    summary: `Palette “${board.palette.name}” rippled through the wedding world`,
    createdBy: workspace.userId,
    impact: updates.map((update) => ({
      area: update.surface,
      note: update.status === 'override_kept' ? 'Manual override preserved.' : 'Palette application updated.',
      severity: update.status === 'override_kept' ? 'low' : undefined,
    })),
  });
  revalidatePath('/canvas/atmosphere');
  revalidatePath('/canvas');
  revalidatePath('/peace-center');
  return { ok: true, palette: board.palette.name, updates };
}

/** Preserve or release one intentional surface override in the 0022 world plan. */
export async function saveSurfaceOverride(
  surface: string,
  override: boolean,
  color?: string,
): Promise<{ ok: true }> {
  const workspace = await requireAtmosphereWrite();
  if (!ATMOSPHERE_SURFACES.includes(surface as (typeof ATMOSPHERE_SURFACES)[number])) {
    throw new Error('Unknown atmosphere surface');
  }
  const { board } = await loadCanvasBoard(workspace.id);
  const palette = planPalette(board.palette.colors);
  const db = supabaseAdmin();
  const { data: current } = await db
    .from('atmosphere_plans')
    .select('surfaces_json')
    .eq('workspace_id', workspace.id)
    .maybeSingle();
  const surfaces = ((current?.surfaces_json as Surface[] | null) || seedSurfaces(palette));
  const byName = new Map(surfaces.map((entry) => [entry.surface, entry]));
  const next = ATMOSPHERE_SURFACES.map((name) => {
    const entry = byName.get(name) ?? { surface: name, applied: false, override: false };
    if (name !== surface) return entry;
    return {
      ...entry,
      override,
      color: override ? (color || entry.color || surfaceTargetColor(name, palette)) : surfaceTargetColor(name, palette),
      note: override ? 'Manual override' : undefined,
    };
  });
  await saveWorldPlan(workspace.id, workspace.userId, palette, next);
  revalidatePath('/canvas/atmosphere');
  return { ok: true };
}
