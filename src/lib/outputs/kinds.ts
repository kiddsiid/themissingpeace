export const OUTPUT_KINDS = [
  'escort-cards',
  'place-cards',
  'table-numbers',
  'seating-sign',
  'menu',
  'caterer-brief',
  'save-the-date',
  'invitation',
  'guest-experience',
  'document-index',
] as const;

export type OutputKind = (typeof OUTPUT_KINDS)[number];

export function isOutputKind(value: string): value is OutputKind {
  return OUTPUT_KINDS.includes(value as OutputKind);
}
