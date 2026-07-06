// Guest page slugs (0013). Pure helpers: derive a lovely default slug from the couple's
// labels and validate user-edited ones (mirrors the DB check constraint).

const SLUG_RE = /^[a-z0-9]([a-z0-9-]{1,60}[a-z0-9])?$/;

/** "Rosa & Sam Alvarez" → "rosa-and-sam-alvarez". Falls back to 'our-wedding'. */
export function suggestSlug(partnerOne?: string | null, partnerTwo?: string | null): string {
  const raw = [partnerOne, partnerTwo].filter(Boolean).join(' and ');
  const slug = raw
    .toLowerCase()
    .replace(/&/g, ' and ')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 62)
    .replace(/^-|-$/g, '');
  // Degenerate inputs can leave only the joiner we injected ("and") — that's not a name.
  if (!isValidSlug(slug) || slug === 'and' || slug.length < 3) return 'our-wedding';
  return slug;
}

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug);
}

/** Normalize a user-typed slug attempt; returns null when unusable. */
export function cleanSlug(input: string): string | null {
  const slug = input.trim().toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return isValidSlug(slug) ? slug : null;
}
