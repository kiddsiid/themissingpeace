import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSessionUser, ensureAppUser } from '@/lib/auth/session';
import type { MemberRole } from '@/lib/types';
import { cookies } from 'next/headers';

export const ACTIVE_WORKSPACE_COOKIE = 'tmp_active_workspace';

export interface ActiveWorkspace {
  id: string;
  name: string;
  userId: string;
  role: MemberRole;
}

async function workspaceById(workspaceId: string) {
  const db = supabaseAdmin();
  const { data } = await db.from('workspaces').select('id, name').eq('id', workspaceId).single();
  return data ? { id: data.id as string, name: data.name as string } : null;
}

// The signed-in user's public.users.id, or null when signed out.
async function currentUserId(): Promise<string | null> {
  const authUser = await getSessionUser();
  if (!authUser) return null;
  return ensureAppUser(authUser);
}

export async function getActiveWorkspace(): Promise<ActiveWorkspace | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const db = supabaseAdmin();

  const memberships = (
    await db
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: true })
  ).data ?? [];
  const preferredId = (await cookies()).get(ACTIVE_WORKSPACE_COOKIE)?.value;
  const membership = memberships.find((item) => item.workspace_id === preferredId) ?? memberships[0];
  if (!membership) return null;

  const workspace = await workspaceById(membership.workspace_id as string);
  if (!workspace) return null;
  return { ...workspace, userId, role: membership.role as MemberRole };
}

export async function requireActiveWorkspace(): Promise<ActiveWorkspace> {
  const ws = await getActiveWorkspace();
  if (!ws) throw new Error('No active workspace membership');
  return ws;
}

export async function requireWorkspaceMember(workspaceId: string): Promise<ActiveWorkspace> {
  const userId = await currentUserId();
  if (!userId) throw new Error('Unauthorized');
  const db = supabaseAdmin();
  const { data: member } = await db
    .from('workspace_members')
    .select('role')
    .eq('workspace_id', workspaceId)
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();
  if (!member) throw new Error('Not a member of this workspace');
  const workspace = await workspaceById(workspaceId);
  if (!workspace) throw new Error('Workspace not found');
  return { ...workspace, userId, role: member.role as MemberRole };
}
