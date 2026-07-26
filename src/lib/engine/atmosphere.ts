// Atmosphere palette ripple (Phase 3, MP-011) — the deterministic engine behind
// "change the palette → these surfaces update, these overrides are kept". Pure +
// I/O-free so it is fully unit-testable without a render, exactly like ripple.ts.

export type Palette = {
  primary: string;
  secondary?: string;
  accent?: string;
  neutrals?: string[];
};

export interface Surface {
  surface: string;         // 'invitation' | 'tablescape' | 'florals' | 'cake' | ...
  applied?: boolean;       // has the palette been applied here at all
  override?: boolean;      // the user hand-set this surface — do not overwrite
  color?: string;          // the color currently shown on this surface
  note?: string;
}

export interface SurfaceUpdate {
  surface: string;
  from?: string;
  to: string;
  status: 'updated' | 'override_kept';
}

// The eight surfaces a palette ripples onto (§11). Kept here so a caller can seed
// a plan that has never been touched.
export const ATMOSPHERE_SURFACES = [
  'invitation', 'tablescape', 'florals', 'cake',
  'lighting', 'menu_card', 'attire_context', 'guest_experience',
] as const;

/** The color a given surface should take from a palette (deterministic mapping). */
export function surfaceTargetColor(surface: string, palette: Palette): string {
  switch (surface) {
    case 'invitation':
    case 'menu_card':
    case 'guest_experience':
      return palette.primary;
    case 'florals':
    case 'cake':
      return palette.accent ?? palette.secondary ?? palette.primary;
    case 'tablescape':
    case 'lighting':
      return palette.secondary ?? palette.primary;
    case 'attire_context':
      return palette.neutrals?.[0] ?? palette.secondary ?? palette.primary;
    default:
      return palette.primary;
  }
}

/**
 * Pure: given a new palette and the current surfaces, return the change set.
 * A surface with `override: true` is never overwritten — it is reported as
 * `override_kept` so the UI can label it. Surfaces not present in `surfaces`
 * are treated as un-applied defaults and will be updated.
 */
export function derivePaletteRipple(next: Palette, surfaces: Surface[] = []): SurfaceUpdate[] {
  const byName = new Map(surfaces.map((s) => [s.surface, s]));
  const out: SurfaceUpdate[] = [];
  for (const surface of ATMOSPHERE_SURFACES) {
    const current = byName.get(surface);
    const to = surfaceTargetColor(surface, next);
    if (current?.override) {
      out.push({ surface, from: current.color, to: current.color ?? to, status: 'override_kept' });
      continue;
    }
    // No change to report if the surface already shows the target color.
    if (current?.color && current.color.toLowerCase() === to.toLowerCase()) continue;
    out.push({ surface, from: current?.color, to, status: 'updated' });
  }
  return out;
}

/** How many surfaces a change actually touches (for the "Applying to N surfaces" state, §22). */
export function updatedSurfaceCount(updates: SurfaceUpdate[]): number {
  return updates.filter((u) => u.status === 'updated').length;
}
