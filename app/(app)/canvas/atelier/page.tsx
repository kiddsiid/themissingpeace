import { redirect } from 'next/navigation';
import { getActiveWorkspace } from '@/lib/workspace/current';
import { loadCanvasBoard, saveCanvasBoard } from '@/lib/canvas/store';
import { can } from '@/lib/auth/permissions';
import { Atelier } from './Atelier';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { AtelierLook } from '@/lib/canvas/types';

function lookRole(party: string, index: number): string {
  const value = party.toLowerCase();
  if (value.includes('partner') || value.includes('bride') || value.includes('groom')) {
    return index === 0 ? 'partner_1' : 'partner_2';
  }
  if (value.includes('guest') || value.includes('dress code')) return 'guest_dress_code';
  return 'party';
}

function lookStatus(look: AtelierLook, approvers: string[]): 'draft' | 'proposed' | 'approved' {
  const approved = approvers.filter((role) => look.approvals?.[role]).length;
  if (approved && approved === approvers.length) return 'approved';
  if (approved) return 'proposed';
  return 'draft';
}

// The Atelier — a fashion studio for composing wedding-party looks against the
// palette, previewing them in the day's contexts, and gathering approvals
// (README §4). Loads the shared board slice and hands `board.attire` +
// palette-linked colors + the editable approver roles to the client studio.
export default async function AtelierPage() {
  const workspace = await getActiveWorkspace();
  if (!workspace) redirect('/onboarding');

  const { board, context } = await loadCanvasBoard(workspace.id, { projectName: workspace.name });
  const db = supabaseAdmin();
  const { data: memberRows } = await db
    .from('workspace_members')
    .select('user_id')
    .eq('workspace_id', workspace.id)
    .eq('status', 'active');
  const memberIds = (memberRows ?? []).map((member: any) => member.user_id).filter(Boolean);
  const { data: userRows } = memberIds.length
    ? await db.from('users').select('id, name, display_name').in('id', memberIds)
    : { data: [] as any[] };
  const memberNames = (userRows ?? []).map((user: any) => user.display_name || user.name).filter(Boolean);
  const approverRoles = memberNames.length ? memberNames : context.approverRoles;
  const idByName = new Map((userRows ?? []).map((user: any) => [user.display_name || user.name, user.id]));

  let { data: worldRows } = await db
    .from('attire_looks')
    .select('id, role, label, items_json, palette_ref, approver_ids, status, version')
    .eq('workspace_id', workspace.id)
    .order('updated_at', { ascending: true });

  // 0022 migration adapter: copy existing Atelier looks into the world table once.
  if (!worldRows?.length && board.attire.looks.length) {
    const payload = board.attire.looks.map((look, index) => ({
      workspace_id: workspace.id,
      role: lookRole(look.party, index),
      label: look.party,
      items_json: [{ ...look, id: undefined }],
      palette_ref: { colors: board.palette.colors },
      approver_ids: approverRoles.filter((name) => look.approvals?.[name]).map((name) => idByName.get(name)).filter(Boolean),
      status: lookStatus(look, approverRoles),
      created_by: workspace.userId,
    }));
    const migrated = await db
      .from('attire_looks')
      .insert(payload)
      .select('id, role, label, items_json, palette_ref, approver_ids, status, version');
    if (migrated.error) throw migrated.error;
    worldRows = migrated.data;
  }

  const dressCodeRow = (worldRows ?? []).find((row: any) => row.role === 'guest_dress_code');
  const looks = (worldRows ?? [])
    .filter((row: any) => row.role !== 'guest_dress_code')
    .map((row: any) => {
      const stored = Array.isArray(row.items_json) ? row.items_json[0] : null;
      return {
        id: row.id,
        party: row.label || stored?.party || row.role.replace(/_/g, ' '),
        title: stored?.title || row.label || 'Untitled look',
        color: stored?.color || '#E7D2C8',
        accent: stored?.accent || '#B8924A',
        notes: stored?.notes || '',
        details: stored?.details || {},
        approvals: stored?.approvals || {},
      } satisfies AtelierLook;
    });
  const dressCodePayload = Array.isArray(dressCodeRow?.items_json) ? dressCodeRow.items_json[0] : null;
  const nextLooks = looks.length ? looks : board.attire.looks;
  const needsCanvasSync = looks.length > 0 && (
    board.attire.looks.length !== looks.length
    || board.attire.looks.some((look, index) => look.id !== looks[index]?.id)
  );
  if (needsCanvasSync) {
    board.attire.looks = looks;
    if (dressCodePayload?.dressCode) board.attire.dressCode = dressCodePayload.dressCode;
    if (Array.isArray(dressCodePayload?.rules)) board.attire.rules = dressCodePayload.rules;
    await saveCanvasBoard(workspace.id, board);
  }

  return (
    <Atelier
      looks={nextLooks}
      dressCode={dressCodePayload?.dressCode || board.attire.dressCode}
      rules={dressCodePayload?.rules || board.attire.rules}
      palette={board.palette.colors}
      approverRoles={approverRoles}
      projectName={context.projectName}
      canEdit={can(workspace.role, 'plan.full')}
    />
  );
}
