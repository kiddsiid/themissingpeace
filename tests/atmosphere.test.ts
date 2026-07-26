import { describe, it, expect } from 'vitest';
import {
  derivePaletteRipple,
  surfaceTargetColor,
  updatedSurfaceCount,
  ATMOSPHERE_SURFACES,
  type Surface,
} from '@/lib/engine/atmosphere';

const PLUM = { primary: '#6b4a6b', secondary: '#9a7b9a', accent: '#c58f6b', neutrals: ['#efe6d2'] };

describe('atmosphere palette ripple (MP-011)', () => {
  it('updates every surface when nothing is applied yet', () => {
    const updates = derivePaletteRipple(PLUM, []);
    expect(updates).toHaveLength(ATMOSPHERE_SURFACES.length);
    expect(updates.every((u) => u.status === 'updated')).toBe(true);
  });

  it('keeps an override and labels it rather than overwriting', () => {
    const surfaces: Surface[] = [{ surface: 'tablescape', color: '#111111', override: true }];
    const updates = derivePaletteRipple(PLUM, surfaces);
    const table = updates.find((u) => u.surface === 'tablescape')!;
    expect(table.status).toBe('override_kept');
    expect(table.to).toBe('#111111'); // unchanged
  });

  it('reports no change for a surface already showing the target color', () => {
    const target = surfaceTargetColor('invitation', PLUM);
    const surfaces: Surface[] = [{ surface: 'invitation', color: target }];
    const updates = derivePaletteRipple(PLUM, surfaces);
    expect(updates.find((u) => u.surface === 'invitation')).toBeUndefined();
  });

  it('maps florals/cake to the accent color', () => {
    expect(surfaceTargetColor('florals', PLUM)).toBe(PLUM.accent);
    expect(surfaceTargetColor('cake', PLUM)).toBe(PLUM.accent);
  });

  it('counts only real updates, not kept overrides', () => {
    const surfaces: Surface[] = [{ surface: 'lighting', color: '#000', override: true }];
    const updates = derivePaletteRipple(PLUM, surfaces);
    expect(updatedSurfaceCount(updates)).toBe(ATMOSPHERE_SURFACES.length - 1);
  });
});
