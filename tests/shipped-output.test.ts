import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const STATIC_PAGES = [
  'prototype/Homepage.html',
  'prototype/Privacy.html',
  'prototype/Terms.html',
  '.pages-prototype/index.html',
  '.pages-prototype/_pages/home',
  '.pages-prototype/_pages/privacy',
  '.pages-prototype/_pages/terms',
];

describe('shipped static output', () => {
  it.each(STATIC_PAGES)('%s has no unresolved template expressions', (relativePath) => {
    const path = resolve(process.cwd(), relativePath);
    if (!existsSync(path)) return;
    const source = readFileSync(path, 'utf8');
    expect(source).not.toMatch(/\{\{[\s\S]*?\}\}/);
  });

  it('keeps the landing build injection points explicit', () => {
    const source = readFileSync(resolve(process.cwd(), 'prototype/Homepage.html'), 'utf8');
    expect(source).toContain('<!--__LANDING_CONFIG__-->');
    expect(source).toContain('<!--__LANDING_JSONLD__-->');
  });

  it('ships parseable homepage JavaScript', () => {
    const source = readFileSync(resolve(process.cwd(), '.pages-prototype/index.html'), 'utf8');
    const scripts = [...source.matchAll(/<script(?![^>]*application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/gi)]
      .map((match) => match[1])
      .filter((script) => script.trim());
    expect(scripts.length).toBeGreaterThan(0);
    for (const script of scripts) expect(() => new Function(script)).not.toThrow();
  });
});
