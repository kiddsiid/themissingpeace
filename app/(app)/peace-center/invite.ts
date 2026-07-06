'use server';
// Invite a partner or planner into the workspace (Build Plan v2 §17/§18).
// Uses Clerk organization invitations; the app role is carried in publicMetadata and
// applied to workspace_members by the Clerk webhook when the invite is accepted.
import { auth, clerkClient } from '@clerk/nextjs/server';
import { requireActiveWorkspace } from '@/lib/workspace/current';
import { can } from '@/lib/auth/permissions';

export async function inviteMember(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const ws = await requireActiveWorkspace();
  if (!can(ws.role, 'plan.full') && !can(ws.role, 'members.manage')) {
    return { ok: false, error: 'You do not have permission to invite.' };
  }
  const email = String(formData.get('email') || '').trim();
  if (!email) return { ok: false, error: 'Please enter an email.' };
  const appRole = String(formData.get('appRole') || 'collaborator');

  const { userId: inviterUserId } = await auth();
  if (!inviterUserId) return { ok: false, error: 'Not signed in.' };

  try {
    const client = await clerkClient();
    await client.organizations.createOrganizationInvitation({
      organizationId: ws.clerkOrgId,
      inviterUserId,
      emailAddress: email,
      role: 'org:member',
      publicMetadata: { appRole },
      redirectUrl: (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000') + '/sign-in',
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.errors?.[0]?.message || e?.message || 'Could not send invitation.' };
  }
}
