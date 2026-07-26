'use server';

// Server actions for The Atelier. Each write follows the repo convention:
// load the board slice → mutate `board.attire` → persist → revalidate. Writes
// are guarded by an active workspace + the `plan.full` capability (matching
// budget/actions.ts). The interactive client keeps optimistic state, so these
// actions carry the minimal change needed to persist it.

import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { loadCanvasBoard, saveCanvasBoard } from '@/lib/canvas/store';
import { requireActiveWorkspace } from '@/lib/workspace/current';
import type { AtelierLook, CanvasBoard, CanvasContext } from '@/lib/canvas/types';
import { supabaseAdmin } from '@/lib/supabase/admin';

async function requireAtelierWrite() {
  const workspace = await requireActiveWorkspace();
  if (!can(workspace.role, 'plan.full')) {
    throw new Error('You do not have permission to edit The Atelier');
  }
  return workspace;
}

/** Load → mutate the attire slice → persist → revalidate. */
async function mutateAttire(
  mutate: (board: CanvasBoard, context: CanvasContext) => Partial<CanvasContext> | void,
) {
  const workspace = await requireAtelierWrite();
  const { board, context } = await loadCanvasBoard(workspace.id);
  const contextPatch = mutate(board, context) || undefined;
  const nextContext: CanvasContext = contextPatch ? { ...context, ...contextPatch } : context;
  await saveCanvasBoard(workspace.id, board, contextPatch);
  revalidatePath('/canvas/atelier');
  revalidatePath('/canvas');
  return { workspace, board, context: nextContext };
}

function worldRole(look: AtelierLook, board: CanvasBoard): string {
  const value = look.party.toLowerCase();
  if (value.includes('guest') || value.includes('dress code')) return 'guest_dress_code';
  if (value.includes('party') || value.includes('bridesmaid') || value.includes('groomsman')) return 'party';
  const primaryLooks = board.attire.looks.filter((entry) => {
    const party = entry.party.toLowerCase();
    return party.includes('partner') || party.includes('bride') || party.includes('groom');
  });
  return primaryLooks.findIndex((entry) => entry.id === look.id) <= 0 ? 'partner_1' : 'partner_2';
}

function worldStatus(look: AtelierLook, roles: string[]): 'draft' | 'proposed' | 'approved' {
  const approved = roles.filter((role) => look.approvals?.[role]).length;
  if (approved && approved === roles.length) return 'approved';
  if (approved) return 'proposed';
  return 'draft';
}

async function resolveApproverIds(workspaceId: string, look: AtelierLook): Promise<string[]> {
  const names = Object.entries(look.approvals ?? {}).filter(([, approved]) => approved).map(([name]) => name);
  if (!names.length) return [];
  const db = supabaseAdmin();
  const { data: members } = await db.from('workspace_members').select('user_id').eq('workspace_id', workspaceId).eq('status', 'active');
  const ids = (members ?? []).map((member: any) => member.user_id).filter(Boolean);
  if (!ids.length) return [];
  const { data: users } = await db.from('users').select('id, name, display_name').in('id', ids);
  return (users ?? [])
    .filter((user: any) => names.includes(user.display_name || user.name))
    .map((user: any) => user.id);
}

async function saveWorldLook(
  workspaceId: string,
  userId: string,
  board: CanvasBoard,
  context: CanvasContext,
  look: AtelierLook,
) {
  const db = supabaseAdmin();
  const { data: current } = await db.from('attire_looks').select('version').eq('id', look.id).eq('workspace_id', workspaceId).maybeSingle();
  const approverIds = await resolveApproverIds(workspaceId, look);
  const { error } = await db.from('attire_looks').upsert({
    id: look.id,
    workspace_id: workspaceId,
    role: worldRole(look, board),
    label: look.party,
    items_json: [{ ...look, id: undefined }],
    palette_ref: { colors: board.palette.colors },
    approver_ids: approverIds,
    status: worldStatus(look, context.approverRoles),
    created_by: userId,
    updated_at: new Date().toISOString(),
    version: Number(current?.version ?? 0) + 1,
  }, { onConflict: 'id' });
  if (error) throw error;
}

export interface LookPatch {
  title?: string;
  notes?: string;
  color?: string;
  accent?: string;
  details?: Record<string, string>;
}

/** Patch a look's top-level fields and/or merge composer details. */
export async function patchLook(lookId: string, patch: LookPatch) {
  const result = await mutateAttire((board) => {
    const look = board.attire.looks.find((l) => l.id === lookId);
    if (!look) return;
    if (patch.title !== undefined) look.title = patch.title;
    if (patch.notes !== undefined) look.notes = patch.notes;
    if (patch.color !== undefined) look.color = patch.color;
    if (patch.accent !== undefined) look.accent = patch.accent;
    if (patch.details) look.details = { ...look.details, ...patch.details };
  });
  const look = result.board.attire.looks.find((entry) => entry.id === lookId);
  if (look) await saveWorldLook(result.workspace.id, result.workspace.userId, result.board, result.context, look);
}

/** Flip a single approver role's approval on the given look. */
export async function toggleApproval(lookId: string, role: string) {
  const result = await mutateAttire((board) => {
    const look = board.attire.looks.find((l) => l.id === lookId);
    if (!look) return;
    look.approvals = { ...look.approvals, [role]: !look.approvals?.[role] };
  });
  const look = result.board.attire.looks.find((entry) => entry.id === lookId);
  if (look) await saveWorldLook(result.workspace.id, result.workspace.userId, result.board, result.context, look);
}

/** Mark a look blessed by setting every approver role to approved. */
export async function blessLook(lookId: string, roles: string[]) {
  const result = await mutateAttire((board) => {
    const look = board.attire.looks.find((l) => l.id === lookId);
    if (!look) return;
    const approvals: Record<string, boolean> = { ...look.approvals };
    roles.forEach((role) => {
      approvals[role] = true;
    });
    look.approvals = approvals;
  });
  const look = result.board.attire.looks.find((entry) => entry.id === lookId);
  if (look) await saveWorldLook(result.workspace.id, result.workspace.userId, result.board, result.context, look);
}

/** Append a newly composed look (id generated on the client). */
export async function addLook(look: AtelierLook) {
  const result = await mutateAttire((board) => {
    if (!board.attire.looks.some((l) => l.id === look.id)) {
      board.attire.looks.push(look);
    }
  });
  const stored = result.board.attire.looks.find((entry) => entry.id === look.id);
  if (stored) await saveWorldLook(result.workspace.id, result.workspace.userId, result.board, result.context, stored);
}

/** Persist the guest dress code + its rules/sensitivities list. */
export async function saveDressCode(dressCode: string, rules: string[]) {
  const result = await mutateAttire((board) => {
    board.attire.dressCode = dressCode;
    board.attire.rules = rules;
  });
  const db = supabaseAdmin();
  const { data: current } = await db
    .from('attire_looks')
    .select('id, version')
    .eq('workspace_id', result.workspace.id)
    .eq('role', 'guest_dress_code')
    .limit(1)
    .maybeSingle();
  const payload = {
    workspace_id: result.workspace.id,
    role: 'guest_dress_code',
    label: 'Guest dress code',
    items_json: [{ dressCode, rules }],
    palette_ref: { colors: result.board.palette.colors },
    approver_ids: [],
    status: 'proposed',
    created_by: result.workspace.userId,
    updated_at: new Date().toISOString(),
    version: Number(current?.version ?? 0) + 1,
  };
  const response = current?.id
    ? await db.from('attire_looks').update(payload).eq('id', current.id)
    : await db.from('attire_looks').insert(payload);
  if (response.error) throw response.error;
}

/**
 * Rename an approver role. Re-keys the approvals map on every look and patches
 * the stored approver roles (preserving the rest of the context).
 */
export async function renameApprover(oldName: string, newName: string, roles: string[]) {
  const clean = newName.trim();
  if (!clean) return;
  const result = await mutateAttire((board, context) => {
    board.attire.looks.forEach((look) => {
      if (look.approvals && oldName in look.approvals) {
        const next = { ...look.approvals };
        const value = next[oldName];
        delete next[oldName];
        next[clean] = value;
        look.approvals = next;
      }
    });
    return { ...context, approverRoles: roles };
  });
  await Promise.all(result.board.attire.looks.map((look) => (
    saveWorldLook(result.workspace.id, result.workspace.userId, result.board, result.context, look)
  )));
}
