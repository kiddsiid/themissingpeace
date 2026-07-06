import { auth } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { syncMembershipFromClerk } from '@/lib/workspace/sync';
import type { MemberRole } from '@/lib/types';

export interface ActiveWorkspace {
  id: string; name: string; clerkOrgId: string;
  userId: string; clerkUserId: string; role: MemberRole;
}

async function workspaceById(workspaceId: string) {
  const db = supabaseAdmin();
  const { data } = await db.from('workspaces').select('id, name, clerk_org_id').eq('id', workspaceId).single();
  return data ? { id: data.id as string, name: data.name as string, clerkOrgId: data.clerk_org_id as string } : null;
}

export async function getActiveWorkspace(): Promise<ActiveWorkspace | null> {
  const { userId: clerkUserId, orgId } = await auth();
  if (!clerkUserId) return null;
  const db = supabaseAdmin();

  const findUser = async () => (await db.from('users').select('id').eq('clerk_user_id', clerkUserId).maybeSingle()).data;
  let user = await findUser();

  // If there's an active org, make sure user + workspace + membership exist (self-heal invites).
  if (orgId) {
    let workspace = (await db.from('workspaces').select('id, name, clerk_org_id').eq('clerk_org_id', orgId).maybeSingle()).data;
    let member = user ? (await db.from('workspace_members').select('role').eq('workspace_id', workspace?.id ?? '').eq('user_id', user.id).eq('status', 'active').maybeSingle()).data : null;
    if (!user || !workspace || !member) {
      try { await syncMembershipFromClerk(clerkUserId, orgId); } catch { /* best effort */ }
      user = await findUser();
      workspace = (await db.from('workspaces').select('id, name, clerk_org_id').eq('clerk_org_id', orgId).maybeSingle()).data;
      member = user ? (await db.from('workspace_members').select('role').eq('workspace_id', workspace?.id ?? '').eq('user_id', user.id).eq('status', 'active').maybeSingle()).data : null;
    }
    if (!user || !workspace || !member) return null;
    return { id: workspace.id, name: workspace.name, clerkOrgId: workspace.clerk_org_id, userId: user.id, clerkUserId, role: member.role as MemberRole };
  }

  // No active org — fall back to the caller's first active membership.
  if (!user) return null;
  const membership = (await db.from('workspace_members').select('workspace_id, role').eq('user_id', user.id).eq('status', 'active').order('created_at', { ascending: true }).limit(1).maybeSingle()).data;
  if (!membership) return null;
  const workspace = await workspaceById(membership.workspace_id as string);
  if (!workspace) return null;
  return { ...workspace, userId: user.id as string, clerkUserId, role: membership.role as MemberRole };
}

export async function requireActiveWorkspace(): Promise<ActiveWorkspace> {
  const ws = await getActiveWorkspace();
  if (!ws) throw new Error('No active workspace membership');
  return ws;
}

export async function requireWorkspaceMember(workspaceId: string): Promise<ActiveWorkspace> {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) throw new Error('Unauthorized');
  const db = supabaseAdmin();
  const { data: user } = await db.from('users').select('id').eq('clerk_user_id', clerkUserId).single();
  if (!user) throw new Error('User not found');
  const { data: member } = await db.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).eq('status', 'active').single();
  if (!member) throw new Error('Not a member of this workspace');
  const workspace = await workspaceById(workspaceId);
  if (!workspace) throw new Error('Workspace not found');
  return { ...workspace, userId: user.id as string, clerkUserId, role: member.role as MemberRole };
}
