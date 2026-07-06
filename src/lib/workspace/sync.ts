// Self-heal membership from Clerk (so invited partners/planners land without a webhook).
// Idempotent: ensures the users row, the workspace row, and an active workspace_members row
// for the caller's currently-active Clerk organization.
import { clerkClient } from '@clerk/nextjs/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function syncMembershipFromClerk(clerkUserId: string, orgId: string): Promise<void> {
  const db = supabaseAdmin();
  const client = await clerkClient();

  // user
  let { data: user } = await db.from('users').select('id').eq('clerk_user_id', clerkUserId).maybeSingle();
  if (!user) {
    const cu = await client.users.getUser(clerkUserId);
    const ins = await db.from('users').upsert({
      clerk_user_id: clerkUserId,
      email: cu.emailAddresses?.[0]?.emailAddress ?? '',
      name: [cu.firstName, cu.lastName].filter(Boolean).join(' ') || null,
      avatar_url: cu.imageUrl ?? null,
    }, { onConflict: 'clerk_user_id' }).select('id').single();
    user = ins.data;
  }
  if (!user) return;

  // workspace
  let { data: ws } = await db.from('workspaces').select('id').eq('clerk_org_id', orgId).maybeSingle();
  if (!ws) {
    const org = await client.organizations.getOrganization({ organizationId: orgId });
    const ins = await db.from('workspaces').upsert({ clerk_org_id: orgId, name: org.name, created_by: user.id }, { onConflict: 'clerk_org_id' }).select('id').single();
    ws = ins.data;
  }
  if (!ws) return;

  // membership (role from invitation publicMetadata.appRole, else by org role)
  let role = 'collaborator';
  try {
    const memberships = await client.users.getOrganizationMembershipList({ userId: clerkUserId });
    const m = (memberships.data ?? []).find((x: any) => x.organization?.id === orgId);
    const appRole = (m?.publicMetadata as any)?.appRole as string | undefined;
    role = appRole || (typeof m?.role === 'string' && m.role.includes('admin') ? 'owner' : 'collaborator');
  } catch { /* default collaborator */ }

  await db.from('workspace_members').upsert(
    { workspace_id: ws.id, user_id: user.id, role, status: 'active' },
    { onConflict: 'workspace_id,user_id' }
  );
}
