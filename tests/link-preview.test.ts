import { describe, it, expect } from 'vitest';
import { itemTypeForUrl } from '@/lib/link-preview';

describe('itemTypeForUrl', () => {
  it('detects pinterest pins vs boards', () => {
    expect(itemTypeForUrl('https://www.pinterest.com/pin/12345/')).toBe('pinterest_pin');
    expect(itemTypeForUrl('https://pinterest.com/user/wedding-board/')).toBe('pinterest_board');
  });
  it('detects social + video sources', () => {
    expect(itemTypeForUrl('https://www.tiktok.com/@x/video/1')).toBe('tiktok');
    expect(itemTypeForUrl('https://instagram.com/p/abc/')).toBe('instagram');
    expect(itemTypeForUrl('https://youtu.be/abc')).toBe('youtube');
  });
  it('falls back to a generic link', () => {
    expect(itemTypeForUrl('https://someflorist.com/gallery')).toBe('link');
  });
});
