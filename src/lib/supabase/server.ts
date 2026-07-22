import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Cookie-bound Supabase client for Server Components, Server Actions, and Route
// Handlers. Reads/writes the Supabase Auth session cookie, so queries run as the
// signed-in user (auth.uid()) and RLS applies. Replaces the old Clerk-token client.
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // `setAll` was called from a Server Component. Safe to ignore when the
            // session is refreshed by middleware (see src/lib/supabase/middleware.ts).
          }
        },
      },
    }
  );
}
