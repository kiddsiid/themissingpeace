// Guest page slugs (0013 / Wave A-B guest surfaces).
import { describe, expect, it } from 'vitest';
import { suggestSlug, isValidSlug, cleanSlug } from '../src/lib/guest-page/slug';

describe('suggestSlug', () => {
  it('builds a lovely slug from partner labels', () => {
    expect(suggestSlug('Rosa', 'Sam')).toBe('rosa-and-sam');
  });
  it('handles ampersands and punctuation', () => {
    expect(suggestSlug('Mary-Jane & Co.', "O'Brien")).toMatch(/^[a-z0-9-]+$/);
  });
  it('strips accents', () => {
    expect(suggestSlug('José', 'Renée')).toBe('jose-and-renee');
  });
  it('falls back when there is nothing to work with', () => {
    expect(suggestSlug(null, null)).toBe('our-wedding');
    expect(suggestSlug('???', '!!!')).toBe('our-wedding');
  });
});

describe('isValidSlug', () => {
  it('accepts clean slugs', () => {
    expect(isValidSlug('rosa-and-sam')).toBe(true);
    expect(isValidSlug('wedding2027')).toBe(true);
  });
  it('rejects bad shapes', () => {
    expect(isValidSlug('-leading')).toBe(false);
    expect(isValidSlug('trailing-')).toBe(false);
    expect(isValidSlug('UPPER')).toBe(false);
    expect(isValidSlug('sp ace')).toBe(false);
    expect(isValidSlug('')).toBe(false);
  });
});

describe('cleanSlug', () => {
  it('normalizes user input', () => {
    expect(cleanSlug('  Rosa & Sam!! ')).toBe('rosa-sam');
  });
  it('returns null when unusable', () => {
    expect(cleanSlug('___')).toBeNull();
    expect(cleanSlug('')).toBeNull();
  });
});
