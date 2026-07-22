'use client';

import { createBrowserClient } from '@supabase/ssr';

// Browser Supabase client for Client Components (sign-in / sign-up forms, OAuth
// buttons). Shares the session cookie with the server client above.
export function supabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
