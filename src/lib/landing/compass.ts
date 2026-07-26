/**
 * The Wedding Compass — deterministic core.
 *
 * Ported verbatim from `prototype/Homepage.html` (the deployed design source of
 * truth). The curve, the thresholds, the status words and the two constellation
 * layouts are the prototype's, unchanged. Nothing here touches the DOM, so the
 * whole model is unit-testable and the React layer never re-derives ranking.
 */

export type CloudId =
  | 'family'
  | 'warmth'
  | 'table'
  | 'music'
  | 'beauty'
  | 'ease'
  | 'memory';

export interface DreamCloud {
  id: CloudId;
  /** Cloud face copy — the thing the day should hold. */
  label: string;
  /** The category line above the label. */
  type: string;
  /** SVG gradient id used to paint the cloud body. */
  grad: 'gp' | 'gg' | 'gs' | 'gc' | 'gb' | 'gr';
  /** Sentence fragment used when this cloud reaches the top three. */
  phrase: string;
}

export interface Point {
  x: number;
  y: number;
}

export type CloudPositions = Record<CloudId, Point>;

/** The seven Dream Clouds, in the prototype's order. */
export const CLOUDS: readonly DreamCloud[] = [
  {
    id: 'family',
    label: 'Family & our people',
    type: 'Our people',
    grad: 'gs',
    phrase: 'family and the people we love at the center',
  },
  {
    id: 'warmth',
    label: 'Warmth over show',
    type: 'The feeling',
    grad: 'gc',
    phrase: 'warmth over production',
  },
  {
    id: 'table',
    label: 'A shared table',
    type: 'Hospitality',
    grad: 'gg',
    phrase: 'one long, generous table of food',
  },
  {
    id: 'music',
    label: 'Music & dancing',
    type: 'Atmosphere',
    grad: 'gb',
    phrase: 'music and dancing well past midnight',
  },
  {
    id: 'beauty',
    label: 'Soft beauty',
    type: 'Aesthetic',
    grad: 'gr',
    phrase: 'a soft, candlelit, natural beauty',
  },
  {
    id: 'ease',
    label: 'Ease & calm',
    type: 'A boundary',
    grad: 'gs',
    phrase: 'a calm that lets us be fully present',
  },
  {
    id: 'memory',
    label: 'Memory & photos',
    type: 'What it means',
    grad: 'gg',
    phrase: 'photographs that remember how it felt',
  },
] as const;

export const CLOUD_BY_ID: Readonly<Record<CloudId, DreamCloud>> = Object.freeze(
  CLOUDS.reduce(
    (acc, cloud) => {
      acc[cloud.id] = cloud;
      return acc;
    },
    {} as Record<CloudId, DreamCloud>,
  ),
);

/** Desktop constellation — px offsets from the moon at the board centre. */
export const POS: CloudPositions = {
  family: { x: 0, y: -148 },
  memory: { x: -166, y: -62 },
  warmth: { x: 166, y: -62 },
  ease: { x: -226, y: 44 },
  table: { x: 226, y: 44 },
  beauty: { x: -116, y: 158 },
  music: { x: 116, y: 158 },
};

/** Narrow-board constellation — moon sits near the top, clouds hang below it. */
export const POS_MOBILE: CloudPositions = {
  family: { x: 0, y: 150 },
  warmth: { x: -92, y: 300 },
  table: { x: 92, y: 300 },
  ease: { x: -92, y: 470 },
  memory: { x: 92, y: 470 },
  beauty: { x: -92, y: 640 },
  music: { x: 92, y: 640 },
};

export const SEASONS: Readonly<Record<string, string>> = {
  Spring: 'radial-gradient(90% 82% at 26% 16%,rgba(169,198,160,.30),transparent 62%)',
  Summer: 'radial-gradient(90% 82% at 26% 16%,rgba(231,200,106,.26),transparent 62%)',
  Fall: 'radial-gradient(96% 88% at 30% 18%,rgba(208,138,91,.24),transparent 64%)',
  Winter: 'radial-gradient(90% 82% at 74% 16%,rgba(157,180,196,.30),transparent 62%)',
};

export interface LightSetting {
  cap: string;
  aura: string;
}

export const LIGHTS: Readonly<Record<string, LightSetting>> = {
  Sunrise: {
    cap: 'At sunrise',
    aura: 'radial-gradient(120% 120% at 50% 62%,rgba(231,162,120,.22),transparent 62%)',
  },
  'Golden hour': {
    cap: 'At golden hour',
    aura: 'radial-gradient(120% 120% at 50% 62%,rgba(184,146,74,.24),transparent 62%)',
  },
  Candlelight: {
    cap: 'By candlelight',
    aura: 'radial-gradient(120% 120% at 50% 62%,rgba(201,140,74,.24),transparent 62%)',
  },
  Starlight: {
    cap: 'Under starlight',
    aura: 'radial-gradient(120% 120% at 50% 62%,rgba(124,147,166,.22),transparent 62%)',
  },
};

export const DEFAULT_SEASON = 'Fall';
export const DEFAULT_LIGHT = 'Golden hour';

/** Boards narrower than this use the mobile constellation. */
export const MOBILE_BOARD_MAX = 620;

/** Priority above this counts as "close to the moon". */
export const CLOSE_THRESHOLD = 0.7;

export function isMobileBoard(boardWidth: number): boolean {
  return boardWidth < MOBILE_BOARD_MAX;
}

export function initialPositions(mobile: boolean): CloudPositions {
  const source = mobile ? POS_MOBILE : POS;
  return CLOUDS.reduce((acc, cloud) => {
    const p = source[cloud.id] ?? { x: 0, y: 0 };
    acc[cloud.id] = { x: p.x, y: p.y };
    return acc;
  }, {} as CloudPositions);
}

/**
 * The compass centre — where the moon sits inside the board. Board-centred on
 * desktop; lifted toward the top on mobile so the clouds hang below it.
 */
export function centre(boardWidth: number, boardHeight: number): Point {
  return {
    x: boardWidth * 0.5,
    y: boardHeight * (isMobileBoard(boardWidth) ? 0.16 : 0.5),
  };
}

/** Distance from the moon → priority, on the prototype's curve. */
export function priority(p: Point): number {
  const dd = Math.hypot(p.x, p.y);
  return Math.max(0.04, Math.min(1, 1 - (dd - 120) / 300));
}

export interface RankedCloud {
  cloud: DreamCloud;
  priority: number;
  /** 0-based position in the ranking. */
  index: number;
  label: string;
}

export function ranked(positions: CloudPositions): RankedCloud[] {
  return CLOUDS.map((cloud) => ({
    cloud,
    priority: priority(positions[cloud.id] ?? { x: 0, y: 0 }),
  }))
    .sort((a, b) => b.priority - a.priority)
    .map((entry, index) => ({
      cloud: entry.cloud,
      priority: entry.priority,
      index,
      label: rankLabel(index, entry.priority),
    }));
}

/** The four calm status words. Never "selected", never a score. */
export function rankLabel(index: number, p: number): string {
  if (index === 0) return 'Guiding the compass';
  if (index < 3) return 'Held close';
  if (p > 0.4) return 'Rising';
  return 'In the constellation';
}

/** The long readout under the board. */
export function sentence(positions: CloudPositions): string {
  const r = ranked(positions);
  if (r.length < 3) {
    return r[0] ? `A wedding built around ${r[0].cloud.phrase}.` : '';
  }
  return `A wedding built around ${r[0].cloud.phrase} — ${r[1].cloud.phrase}, and ${r[2].cloud.phrase}.`;
}

/** The short reading on the moon face. */
export function compassShort(positions: CloudPositions): string {
  const r = ranked(positions);
  if (r.length >= 2) {
    return `Rooted in ${r[0].cloud.label.toLowerCase()}, lifted by ${r[1].cloud.label.toLowerCase()}.`;
  }
  return r[0]?.cloud.label ?? 'An intimate, family-first celebration.';
}

export interface BoardBox {
  width: number;
  height: number;
}

/** Keep a cloud inside the board, measured from the moon. */
export function clampPosition(p: Point, board: BoardBox): Point {
  const c0 = centre(board.width, board.height);
  const maxX = board.width / 2 - 40;
  const up = c0.y - 40;
  const dn = board.height - c0.y - 40;
  return {
    x: Math.max(-maxX, Math.min(maxX, p.x)),
    y: Math.max(-up, Math.min(dn, p.y)),
  };
}

export interface CloudMetrics {
  width: number;
  svgHeight: number;
  labelSize: number;
  typeSize: number;
  rankSize: number;
  zIndex: number;
  floatDuration: string;
  floatDelay: string;
  sparkOpacity: number;
  rankColor: string;
}

/** Size, depth and float timing for a cloud at a given rank/priority. */
export function cloudMetrics(index: number, p: number): CloudMetrics {
  const width = 128 + p * 46;
  const labelSize = Math.max(11.5, Math.min(17.5, width * 0.108));
  return {
    width,
    svgHeight: Math.round((width * 170) / 260),
    labelSize: Number(labelSize.toFixed(1)),
    typeSize: Number(Math.max(7, labelSize * 0.5).toFixed(1)),
    rankSize: Number(Math.max(7.5, labelSize * 0.56).toFixed(1)),
    zIndex: index < 3 ? 12 : 10,
    floatDuration: `${7.5 + index * 0.5}s`,
    floatDelay: `${(index % 4) * 0.5}s`,
    sparkOpacity: index < 3 ? 0.95 : 0.4,
    rankColor: index < 3 ? 'var(--gold)' : 'var(--ink-faint)',
  };
}

/** Screen-reader description for a cloud. */
export function cloudAriaLabel(cloud: DreamCloud, rank: string): string {
  return `${cloud.label}, ${cloud.type}. ${rank}. Drag toward the moon, or use arrow keys to move it.`;
}

export const KEY_STEP = 18;

/**
 * Enter/Space on a focused cloud: a cloud already held close returns to its
 * place in the constellation; anything else is pulled 65% of the way in.
 */
export function toggleCloud(
  id: CloudId,
  positions: CloudPositions,
  mobile: boolean,
): { position: Point; pulsed: boolean } {
  const current = positions[id] ?? { x: 0, y: 0 };
  if (priority(current) > CLOSE_THRESHOLD) {
    const home = (mobile ? POS_MOBILE : POS)[id] ?? { x: 0, y: 0 };
    return { position: { x: home.x, y: home.y }, pulsed: false };
  }
  return { position: { x: current.x * 0.35, y: current.y * 0.35 }, pulsed: true };
}
