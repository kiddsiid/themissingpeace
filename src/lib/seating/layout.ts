// Seat geometry (Seating Studio — North Star Wave A). Pure math: given a table's shape
// and capacity, return each seat's position relative to the table's top-left corner.
// The studio renders these as seat dots; assignments snap guests onto seat indexes.

export type TableShape = 'round' | 'rect' | 'square' | 'head' | 'row';

export interface SeatPoint {
  index: number;
  x: number; // center of the seat dot, relative to table top-left
  y: number;
}

export interface TableFrame {
  shape: TableShape;
  w: number;
  h: number;
  capacity: number;
}

const SEAT_GAP = 16; // distance seats float off the table edge

/** Seats evenly spaced around a circle/ellipse (round tables). Seat 0 at top, clockwise. */
function roundSeats(w: number, h: number, capacity: number): SeatPoint[] {
  const cx = w / 2;
  const cy = h / 2;
  const rx = w / 2 + SEAT_GAP;
  const ry = h / 2 + SEAT_GAP;
  return Array.from({ length: capacity }, (_, i) => {
    const angle = (i / capacity) * Math.PI * 2 - Math.PI / 2;
    return { index: i, x: cx + rx * Math.cos(angle), y: cy + ry * Math.sin(angle) };
  });
}

/** Distribute n seats evenly along a horizontal span [x0..x1] at height y. */
function spread(n: number, x0: number, x1: number, y: number, startIndex: number): SeatPoint[] {
  if (n <= 0) return [];
  const step = (x1 - x0) / (n + 1);
  return Array.from({ length: n }, (_, i) => ({ index: startIndex + i, x: x0 + step * (i + 1), y }));
}

/** Rectangular table: seats split across the two long sides (plus head/foot when it helps).
 *  Long sides get the bulk; if capacity is odd or > 2×side capacity, ends take the overflow. */
function rectSeats(w: number, h: number, capacity: number): SeatPoint[] {
  // Ends only when we can't fit everyone on the long sides comfortably (≥90px per seat).
  const comfortable = Math.max(1, Math.floor(w / 90));
  const useEnds = capacity > comfortable * 2;
  const ends = useEnds ? Math.min(2, capacity) : 0;
  const remaining = capacity - ends;
  const top = Math.ceil(remaining / 2);
  const bottom = remaining - top;
  const seats: SeatPoint[] = [
    ...spread(top, 0, w, -SEAT_GAP, 0),
    ...spread(bottom, 0, w, h + SEAT_GAP, top),
  ];
  if (ends >= 1) seats.push({ index: capacity - ends, x: -SEAT_GAP, y: h / 2 });
  if (ends === 2) seats.push({ index: capacity - 1, x: w + SEAT_GAP, y: h / 2 });
  return seats;
}

/** Head table / sweetheart: everyone on one side, facing the room. */
function headSeats(w: number, h: number, capacity: number): SeatPoint[] {
  return spread(capacity, 0, w, -SEAT_GAP, 0);
}

/** Ceremony row: a straight bench of seats along the row's length. */
function rowSeats(w: number, h: number, capacity: number): SeatPoint[] {
  return spread(capacity, 0, w, h / 2, 0);
}

/** All seat positions for a table. Deterministic; indexes are stable 0..capacity-1. */
export function seatPositions(frame: TableFrame): SeatPoint[] {
  const { shape, w, h } = frame;
  const capacity = Math.max(1, Math.min(40, Math.round(frame.capacity)));
  switch (shape) {
    case 'round': return roundSeats(w, h, capacity);
    case 'square': return roundSeats(w, h, capacity); // seats ring a square table too
    case 'rect': return rectSeats(w, h, capacity);
    case 'head': return headSeats(w, h, capacity);
    case 'row': return rowSeats(w, h, capacity);
    default: return roundSeats(w, h, capacity);
  }
}

/** Sensible default footprint for a new table of a given shape + capacity. */
export function defaultFrame(shape: TableShape, capacity: number): { w: number; h: number } {
  switch (shape) {
    case 'round': {
      const d = Math.max(110, 34 * Math.sqrt(capacity) * 2.2);
      return { w: d, h: d };
    }
    case 'square': return { w: 130, h: 130 };
    case 'rect': return { w: Math.max(200, capacity * 45), h: 100 };
    case 'head': return { w: Math.max(240, capacity * 60), h: 70 };
    case 'row': return { w: Math.max(220, capacity * 40), h: 34 };
    default: return { w: 140, h: 140 };
  }
}

/** First open seat index on a table given taken indexes, or null when full. */
export function firstOpenSeat(capacity: number, taken: Iterable<number>): number | null {
  const used = new Set(taken);
  for (let i = 0; i < capacity; i++) if (!used.has(i)) return i;
  return null;
}

/** Initials for a seat dot ("Aunt Rosa" → "AR"). */
export function seatInitials(firstName?: string | null, lastName?: string | null): string {
  const a = (firstName ?? '').trim()[0] ?? '';
  const b = (lastName ?? '').trim()[0] ?? '';
  return (a + b).toUpperCase() || '·';
}
