import { createClient } from '@supabase/supabase-js';

// Service-role client for trusted server code (server actions / route handlers).
// RLS is bypassed by the service role, so callers MUST scope queries by workspace
// and enforce capability checks themselves (see src/lib/auth/permissions.ts).
export function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
