// Derived progress for the Living Canvas rooms. Pure functions over the board
// slice so both the hub (rings) and the studios (contextual bars) agree.

import type { CanvasBoard } from './types';

export interface RoomProgress {
  pct: number;          // 0..100
  aligned: boolean;     // ring turns sage at >= 66
  statusLabel: string;
  statusSub: string;
}

const SAGE_AT = 66;

/** Feast pct = courses with >= 1 dish / total (min 9). */
export function feastProgress(board: CanvasBoard): RoomProgress {
  const courses = board.food.courses ?? [];
  const total = Math.max(courses.length, 9);
  const ready = courses.filter((c) => (c.dishes ?? []).length > 0).length;
  const pct = total ? Math.round((ready / total) * 100) : 0;
  return {
    pct,
    aligned: pct >= SAGE_AT,
    statusLabel: `${ready} of ${total} moments shaped`,
    statusSub: 'welcome drink → sendoff',
  };
}

/** Phase 5 Feast progress from the canonical scene/dish tables. */
export function feastPlanProgress(
  scenes: Array<{ id: string; status?: string | null }>,
  dishes: Array<{ scene_id: string }>,
): RoomProgress {
  const active = scenes.filter((scene) => scene.status !== 'archived');
  const shaped = active.filter((scene) => dishes.some((dish) => dish.scene_id === scene.id)).length;
  const ready = active.filter((scene) => scene.status === 'ready').length;
  const total = active.length;
  const pct = total ? Math.round((shaped / total) * 100) : 0;
  return {
    pct,
    aligned: pct >= SAGE_AT,
    statusLabel: `${shaped} of ${total} moments shaped`,
    statusSub: ready
      ? `${ready} ready for the caterer brief`
      : 'welcome drink → sendoff',
  };
}

/**
 * Atmosphere pct = 100 if palette aligned (wedding.palette === board.palette.name)
 * else 55.
 */
export function atmosphereProgress(board: CanvasBoard, weddingPalette: string): RoomProgress {
  const aligned = !!weddingPalette && weddingPalette === board.palette.name;
  const pct = aligned ? 100 : 55;
  const words = (board.palette.atmosphere ?? []).length;
  return {
    pct,
    aligned: pct >= SAGE_AT,
    statusLabel: aligned ? 'Palette aligned' : 'Palette in draft',
    statusSub: `${words} feeling words chosen`,
  };
}

/** A look is blessed when every approver has approved it. */
export function isLookBlessed(approvals: Record<string, boolean>): boolean {
  const values = Object.values(approvals ?? {});
  return values.length > 0 && values.every(Boolean);
}

/** Atelier pct = blessed looks / total. */
export function atelierProgress(board: CanvasBoard): RoomProgress {
  const looks = board.attire.looks ?? [];
  const total = looks.length;
  const blessed = looks.filter((l) => isLookBlessed(l.approvals)).length;
  const pct = total ? Math.round((blessed / total) * 100) : 0;
  return {
    pct,
    aligned: pct >= SAGE_AT,
    statusLabel: `${blessed} of ${total} looks blessed`,
    statusSub: 'composed against the palette',
  };
}
