import { auth } from '@clerk/nextjs/server';
import { createClient } from '@supabase/supabase-js';

// RLS-respecting client for server reads/mutations that should run as the current
// Clerk user. Requires Clerk's native Supabase integration and migration 0003,
// which makes auth_workspace_ids() read the Clerk user id from auth.jwt().
export async function supabaseForUser() {
  const { getToken } = await auth();

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: false },
      accessToken: async () => getToken(),
    }
  );
}
