import type { User } from '@supabase/supabase-js';
import { supabaseServer } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

// The Supabase Auth user for the current request (or null when signed out).
export async function getSessionUser(): Promise<User | null> {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Platform identity is stored in server-controlled app_metadata. Never use
// user_metadata for authorization because users can edit it themselves.
export function isBackendAdmin(
  authUser: Pick<User, 'app_metadata'> | null | undefined,
): boolean {
  return authUser?.app_metadata?.backend_admin === true;
}

// Ensures a public.users row exists for the signed-in Supabase user and that it is
// linked via auth_user_id = auth.uid(). Returns the public.users.id (the join key
// used by workspace_members and every workspace-scoped table).
//
// Transition-safe: if a legacy row already exists for this email (created in the
// Clerk era with a null auth_user_id), it is adopted rather than duplicated.
export async function ensureAppUser(authUser: User): Promise<string> {
  const db = supabaseAdmin();

  const byAuth = await db.from('users').select('id').eq('auth_user_id', authUser.id).maybeSingle();
  if (byAuth.data?.id) return byAuth.data.id as string;

  const email = authUser.email ?? '';
  const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (meta.name as string) ||
    (meta.full_name as string) ||
    [meta.first_name, meta.last_name].filter(Boolean).join(' ') ||
    null;
  const avatar = (meta.avatar_url as string) || (meta.picture as string) || null;

  if (email) {
    const byEmail = await db.from('users').select('id, auth_user_id').eq('email', email).maybeSingle();
    if (byEmail.data?.id && !byEmail.data.auth_user_id) {
      const linked = await db
        .from('users')
        .update({ auth_user_id: authUser.id, name: name ?? undefined, avatar_url: avatar ?? undefined })
        .eq('id', byEmail.data.id)
        .select('id')
        .single();
      if (linked.data?.id) return linked.data.id as string;
    } else if (byEmail.data?.id) {
      return byEmail.data.id as string;
    }
  }

  const inserted = await db
    .from('users')
    .insert({ auth_user_id: authUser.id, email, name, avatar_url: avatar })
    .select('id')
    .single();
  if (inserted.error) throw inserted.error;
  return inserted.data.id as string;
}

// Convenience: current signed-in user's public.users.id, or null when signed out.
export async function getAppUserId(): Promise<string | null> {
  const authUser = await getSessionUser();
  if (!authUser) return null;
  return ensureAppUser(authUser);
}
