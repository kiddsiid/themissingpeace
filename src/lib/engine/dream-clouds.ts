export const DREAM_CLOUDS = [
  { id: 'family', label: 'Family & our people', type: 'Our people', phrase: 'family and the people we love at the center' },
  { id: 'warmth', label: 'Warmth over show', type: 'The feeling', phrase: 'warmth over production' },
  { id: 'table', label: 'A shared table', type: 'Hospitality', phrase: 'one long, generous table of food' },
  { id: 'music', label: 'Music & dancing', type: 'Atmosphere', phrase: 'music and dancing well past midnight' },
  { id: 'beauty', label: 'Soft beauty', type: 'Aesthetic', phrase: 'a soft, candlelit, natural beauty' },
  { id: 'ease', label: 'Ease & calm', type: 'A boundary', phrase: 'a calm that lets us be fully present' },
  { id: 'memory', label: 'Memory & photos', type: 'What it means', phrase: 'photographs that remember how it felt' },
] as const;

export type DreamCloudId = (typeof DREAM_CLOUDS)[number]['id'];
export type CloudPriorities = Partial<Record<DreamCloudId, number>>;

export function normalizedCloudPriority(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return 0.4;
  return Math.max(0.04, Math.min(1, parsed));
}

export function rankedDreamClouds(priorities: CloudPriorities = {}) {
  return DREAM_CLOUDS
    .map((cloud, originalIndex) => ({
      cloud,
      priority: normalizedCloudPriority(priorities[cloud.id]),
      originalIndex,
    }))
    .sort((a, b) => b.priority - a.priority || a.originalIndex - b.originalIndex);
}

export function cloudRankLabel(rank: number, priority: number): string {
  if (rank === 0) return 'Guiding the compass';
  if (rank < 3) return 'Held close';
  if (priority > 0.4) return 'Rising';
  return 'In the constellation';
}

export function compassShort(priorities: CloudPriorities = {}): string {
  const ranked = rankedDreamClouds(priorities);
  if (ranked.length >= 2) {
    return `Rooted in ${ranked[0].cloud.label.toLowerCase()}, lifted by ${ranked[1].cloud.label.toLowerCase()}.`;
  }
  return ranked[0]?.cloud.label || 'An intimate, family-first celebration.';
}

export function compassSentence(priorities: CloudPriorities = {}): string {
  const ranked = rankedDreamClouds(priorities);
  if (ranked.length < 3) {
    return ranked[0] ? `A wedding built around ${ranked[0].cloud.phrase}.` : '';
  }
  return `A wedding built around ${ranked[0].cloud.phrase} — ${ranked[1].cloud.phrase}, and ${ranked[2].cloud.phrase}.`;
}
