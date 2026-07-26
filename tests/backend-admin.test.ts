import { describe, expect, it } from 'vitest';
import { isBackendAdmin } from '@/lib/auth/session';

describe('backend admin identity', () => {
  it('trusts only the server-owned app metadata claim', () => {
    expect(isBackendAdmin({ app_metadata: { backend_admin: true } })).toBe(true);
    expect(isBackendAdmin({ app_metadata: { backend_admin: false } })).toBe(false);
    expect(isBackendAdmin({ app_metadata: {} })).toBe(false);
    expect(isBackendAdmin(null)).toBe(false);
  });
});
