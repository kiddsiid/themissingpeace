// Small color helpers for palette-driven CSS illustrations (room motifs,
// surface previews, figures). Ported from the prototype's hx/mix/tint/shade.

function hx(hex: string): [number, number, number] {
  let h = (hex || '#000').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [
    parseInt(h.slice(0, 2), 16) || 0,
    parseInt(h.slice(2, 4), 16) || 0,
    parseInt(h.slice(4, 6), 16) || 0,
  ];
}

export function mix(hex: string, target: string, amt: number): string {
  const a = hx(hex);
  const b = hx(target);
  return (
    '#' +
    a
      .map((v, i) => Math.round(v + (b[i] - v) * amt).toString(16).padStart(2, '0'))
      .join('')
  );
}

export const tint = (hex: string, amt: number) => mix(hex, '#ffffff', amt);
export const shade = (hex: string, amt: number) => mix(hex, '#000000', amt);

/** Relative luminance-based readable text color for a swatch background. */
export function readableInk(hex: string): string {
  const [r, g, b] = hx(hex);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#3A3631' : '#FFFDF9';
}
