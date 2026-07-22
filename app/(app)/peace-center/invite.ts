'use server';
// Invite a partner or planner into the workspace (Build Plan v2 §17/§18).
// Supabase-native: we record the invitee (by email) and grant them an active
// membership with the chosen app role. When they sign up with the same email,
// ensureAppUser() adopts the existing users row, so they land straight in the
// workspace. (A token-based accept flow can layer on later.)
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireActiveWorkspace } from '@/lib/workspace/current';
import { can } from '@/lib/auth/permissions';
import type { MemberRole } from '@/lib/types';

const ALLOWED_ROLES: MemberRole[] = ['partner', 'planner', 'collaborator', 'contributor', 'viewer'];

export async function inviteMember(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const ws = await requireActiveWorkspace();
  if (!can(ws.role, 'plan.full') && !can(ws.role, 'members.manage')) {
    return { ok: false, error: 'You do not have permission to invite.' };
  }
  const email = String(formData.get('email') || '').trim().toLowerCase();
  if (!email) return { ok: false, error: 'Please enter an email.' };
  const requested = String(formData.get('appRole') || 'collaborator') as MemberRole;
  const role: MemberRole = ALLOWED_ROLES.includes(requested) ? requested : 'collaborator';

  const db = supabaseAdmin();
  try {
    let { data: user } = await db.from('users').select('id').eq('email', email).maybeSingle();
    if (!user) {
      const ins = await db.from('users').insert({ email }).select('id').single();
      if (ins.error) throw ins.error;
      user = ins.data;
    }

    const { error } = await db.from('workspace_members').upsert(
      { workspace_id: ws.id, user_id: user!.id, role, status: 'active', invited_by: ws.userId },
      { onConflict: 'workspace_id,user_id' }
    );
    if (error) throw error;
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message || 'Could not send invitation.' };
  }
}
