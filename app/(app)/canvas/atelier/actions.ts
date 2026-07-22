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
  await saveCanvasBoard(workspace.id, board, contextPatch);
  revalidatePath('/canvas/atelier');
  revalidatePath('/canvas');
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
  await mutateAttire((board) => {
    const look = board.attire.looks.find((l) => l.id === lookId);
    if (!look) return;
    if (patch.title !== undefined) look.title = patch.title;
    if (patch.notes !== undefined) look.notes = patch.notes;
    if (patch.color !== undefined) look.color = patch.color;
    if (patch.accent !== undefined) look.accent = patch.accent;
    if (patch.details) look.details = { ...look.details, ...patch.details };
  });
}

/** Flip a single approver role's approval on the given look. */
export async function toggleApproval(lookId: string, role: string) {
  await mutateAttire((board) => {
    const look = board.attire.looks.find((l) => l.id === lookId);
    if (!look) return;
    look.approvals = { ...look.approvals, [role]: !look.approvals?.[role] };
  });
}

/** Mark a look blessed by setting every approver role to approved. */
export async function blessLook(lookId: string, roles: string[]) {
  await mutateAttire((board) => {
    const look = board.attire.looks.find((l) => l.id === lookId);
    if (!look) return;
    const approvals: Record<string, boolean> = { ...look.approvals };
    roles.forEach((role) => {
      approvals[role] = true;
    });
    look.approvals = approvals;
  });
}

/** Append a newly composed look (id generated on the client). */
export async function addLook(look: AtelierLook) {
  await mutateAttire((board) => {
    if (!board.attire.looks.some((l) => l.id === look.id)) {
      board.attire.looks.push(look);
    }
  });
}

/** Persist the guest dress code + its rules/sensitivities list. */
export async function saveDressCode(dressCode: string, rules: string[]) {
  await mutateAttire((board) => {
    board.attire.dressCode = dressCode;
    board.attire.rules = rules;
  });
}

/**
 * Rename an approver role. Re-keys the approvals map on every look and patches
 * the stored approver roles (preserving the rest of the context).
 */
export async function renameApprover(oldName: string, newName: string, roles: string[]) {
  const clean = newName.trim();
  if (!clean) return;
  await mutateAttire((board, context) => {
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
}
