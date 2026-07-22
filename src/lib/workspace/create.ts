import { supabaseAdmin } from '@/lib/supabase/admin';

// Creates a Supabase-native workspace (no Clerk org) with the given user as the
// active owner. Returns the new workspace id. clerk_org_id is left null (0021).
export async function createWorkspaceWithOwner(userId: string, name: string): Promise<string> {
  const db = supabaseAdmin();

  const { data: workspace, error } = await db
    .from('workspaces')
    .insert({ name: name?.trim() || 'Our Wedding', created_by: userId })
    .select('id')
    .single();
  if (error || !workspace) throw error ?? new Error('Workspace not created');

  const { error: memberError } = await db.from('workspace_members').insert({
    workspace_id: workspace.id,
    user_id: userId,
    role: 'owner',
    status: 'active',
    invited_by: userId,
  });
  if (memberError) throw memberError;

  return workspace.id as string;
}

// The user's first active workspace, if any (used to avoid creating duplicates).
export async function firstActiveWorkspaceId(userId: string): Promise<string | null> {
  const db = supabaseAdmin();
  const { data } = await db
    .from('workspace_members')
    .select('workspace_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.workspace_id as string) ?? null;
}

export interface WelcomeBasics {
  workspaceName?: string;
  creatorRole?: string;
  partnerOneLabel?: string;
  partnerTwoLabel?: string;
}

// Seeds the minimal "tell us about you" answers onto a workspace's wedding profile.
// Dream Walk fills in the rest later; this just records the partner labels early.
export async function seedWelcomeBasics(workspaceId: string, basics: WelcomeBasics): Promise<void> {
  const db = supabaseAdmin();
  await db.from('wedding_profiles').upsert(
    {
      workspace_id: workspaceId,
      partner_one_label: basics.partnerOneLabel || 'Partner One',
      partner_two_label: basics.partnerTwoLabel || 'Partner Two',
    },
    { onConflict: 'workspace_id' }
  );
}
