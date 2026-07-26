'use server';

import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireActiveWorkspace } from '@/lib/workspace/current';
import type { MemberRole } from '@/lib/types';

const ASSIGNABLE_ROLES: MemberRole[] = ['owner', 'partner', 'planner', 'collaborator', 'contributor', 'viewer'];

export async function updateMemberRole(formData: FormData) {
  const workspace = await requireActiveWorkspace();
  if (!can(workspace.role, 'members.manage')) throw new Error('Only an owner can manage member roles');
  const memberId = String(formData.get('member_id') || '');
  const role = String(formData.get('role') || '') as MemberRole;
  const partnerLabel = String(formData.get('partner_label') || '').trim() || null;
  if (!memberId || !ASSIGNABLE_ROLES.includes(role)) throw new Error('Choose a member and role');

  const db = supabaseAdmin();
  const { data: target } = await db
    .from('workspace_members')
    .select('id, user_id, role')
    .eq('id', memberId)
    .eq('workspace_id', workspace.id)
    .maybeSingle();
  if (!target) throw new Error('Member not found');
  if (target.user_id === workspace.userId && target.role === 'owner' && role !== 'owner') {
    throw new Error('Transfer ownership before changing your own owner role');
  }

  const { error } = await db
    .from('workspace_members')
    .update({ role, partner_label: partnerLabel })
    .eq('id', memberId)
    .eq('workspace_id', workspace.id);
  if (error) throw error;
  await db.from('audit_events').insert({
    workspace_id: workspace.id,
    actor_id: workspace.userId,
    action: 'member_role_updated',
    entity_type: 'workspace_member',
    entity_id: memberId,
    meta: { from: target.role, to: role },
  });
  revalidatePath('/settings');
}
