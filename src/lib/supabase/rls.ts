import { supabaseServer } from '@/lib/supabase/server';

// RLS-respecting client for server reads/mutations that should run as the current
// signed-in user. Backed by the Supabase Auth session cookie, so auth.uid() (and
// therefore auth_workspace_ids(), migration 0020) resolves to the caller.
export async function supabaseForUser() {
  return supabaseServer();
}
