// The Poof conversion engine (Build Plan v2 §5). Converts a board item into a real
// plan object — additively + reversibly — always writing a board_item_links edge so the
// inspiration <-> plan thread survives. The board item is NEVER destroyed.
//
// Implemented against the service-role client; callers come through the server action
// in app/(app)/board/actions.ts which supplies the authenticated actor.

import { supabaseAdmin } from '@/lib/supabase/admin';
import { canPoofInto } from '@/lib/auth/permissions';
import type { PoofTarget, MemberRole, LinkTargetType } from '@/lib/types';

export interface PoofInput {
  workspaceId: string;
  boardItemId: string;
  actorUserId: string;       // users.id
  actorRole: MemberRole;
  target: PoofTarget;
  overrides?: Record<string, unknown>;
}
export interface PoofResult {
  targetType: PoofTarget;
  targetId: string;
  sideEffects: { type: string; id: string }[];
  linkId: string | null;     // null for guest_experience_note (not a link_target)
}

export interface BoardItemSnapshot { title?: string; body?: string; sourceUrl?: string; boardType?: string; colorHex?: string }
export type PoofPrefill = Record<string, unknown>;

// Field carry-over (Build Plan v2 §5.2).
export const prefillFor: Record<PoofTarget, (b: BoardItemSnapshot) => PoofPrefill> = {
  vendor: (b) => ({ name: b.title ?? 'New vendor', website: b.sourceUrl, internal_notes: b.body, status: 'shortlisted', category: guessVendorCategory(b.boardType) }),
  task: (b) => ({ title: b.title ?? 'New task', description: b.body, status: 'not_started', category: boardTypeToTaskCategory(b.boardType) }),
  budget_item: (b) => ({ title: b.title ?? 'New budget item' }),
  decision: (b) => ({ title: b.title ? `Decide: ${b.title}` : 'New decision', status: 'open', category: boardTypeToDecisionCategory(b.boardType) }),
  event: (b) => ({ title: b.title ?? 'New event', kind: b.boardType === 'reception' || b.boardType === 'ceremony' ? 'run_of_show' : 'planning_task' }),
  document: (b) => ({ title: b.title ?? 'Document' }),
  honeymoon_item: (b) => ({ title: b.title ?? 'Honeymoon idea', notes: b.body, status: 'dreaming' }),
  guest_experience_note: (b) => ({ note: b.title ?? b.body ?? '' }),
};

const LINK_TARGETS: PoofTarget[] = ['vendor','task','budget_item','decision','event','document','honeymoon_item'];

export async function poofBoardItem(input: PoofInput): Promise<PoofResult> {
  if (!canPoofInto(input.actorRole, input.target)) {
    throw new Error(`Role ${input.actorRole} cannot poof into ${input.target}.`);
  }
  const db = supabaseAdmin();

  // Load the board item snapshot (+ its board's type for smart prefill).
  const { data: item, error: itemErr } = await db
    .from('board_items')
    .select('id, workspace_id, title, body, source_url, board:boards(type)')
    .eq('id', input.boardItemId)
    .single();
  if (itemErr || !item) throw itemErr ?? new Error('Board item not found');
  if (item.workspace_id !== input.workspaceId) throw new Error('Workspace mismatch');

  const snap: BoardItemSnapshot = {
    title: item.title ?? undefined,
    body: item.body ?? undefined,
    sourceUrl: (item as any).source_url ?? undefined,
    boardType: (item as any).board?.type,
  };
  const prefill = { ...prefillFor[input.target](snap), ...(input.overrides ?? {}) };

  const adapter = adapters[input.target];
  if (!adapter) throw new Error(`No adapter for ${input.target}`);
  const { targetId, sideEffects } = await adapter(db, input, prefill);

  // Write the bidirectional link (for the seven link_target types).
  let linkId: string | null = null;
  if (LINK_TARGETS.includes(input.target)) {
    const { data: link } = await db
      .from('board_item_links')
      .insert({ board_item_id: input.boardItemId, target_type: input.target as LinkTargetType, target_id: targetId, created_by: input.actorUserId })
      .select('id')
      .single();
    linkId = link?.id ?? null;
  }

  // Mark the item "set in peace" (poofed) — it stays on the board.
  await db.from('board_items').update({ disposition: 'poofed', updated_at: new Date().toISOString() }).eq('id', input.boardItemId);
  await audit(db, input.workspaceId, input.actorUserId, 'poof', input.target, targetId, { boardItemId: input.boardItemId });

  return { targetType: input.target, targetId, sideEffects, linkId };
}

// Un-poof: delete a poof's child object + its link; reset disposition if no links remain.
export async function unpoof(workspaceId: string, actorUserId: string, linkId: string): Promise<void> {
  const db = supabaseAdmin();
  const { data: link } = await db.from('board_item_links').select('id, board_item_id, target_type, target_id').eq('id', linkId).single();
  if (!link) return;
  const table = TARGET_TABLE[link.target_type as LinkTargetType];
  if (table) await db.from(table).delete().eq('id', link.target_id);
  await db.from('board_item_links').delete().eq('id', linkId);
  const { count } = await db.from('board_item_links').select('id', { count: 'exact', head: true }).eq('board_item_id', link.board_item_id);
  if (!count) await db.from('board_items').update({ disposition: 'approved' }).eq('id', link.board_item_id);
  await audit(db, workspaceId, actorUserId, 'unpoof', link.target_type, link.target_id, { linkId });
}

type DB = ReturnType<typeof supabaseAdmin>;
type Adapter = (db: DB, input: PoofInput, prefill: PoofPrefill) => Promise<{ targetId: string; sideEffects: { type: string; id: string }[] }>;

const TARGET_TABLE: Record<LinkTargetType, string> = {
  vendor: 'vendors', task: 'tasks', budget_item: 'budget_items', decision: 'decisions',
  event: 'events', document: 'documents', honeymoon_item: 'honeymoon_items',
};

async function insertReturningId(db: DB, table: string, row: Record<string, unknown>): Promise<string> {
  const { data, error } = await db.from(table).insert(row).select('id').single();
  if (error) throw error;
  return data!.id as string;
}

const adapters: Partial<Record<PoofTarget, Adapter>> = {
  vendor: async (db, input, prefill) => {
    const vendorId = await insertReturningId(db, 'vendors', { workspace_id: input.workspaceId, created_by: input.actorUserId, ...prefill });
    // Side effect (§5.2): auto-create a follow-up "Inquire with {vendor}" task, linked to the same board item.
    const taskId = await insertReturningId(db, 'tasks', {
      workspace_id: input.workspaceId, created_by: input.actorUserId,
      title: `Inquire with ${prefill.name ?? 'vendor'}`, category: 'vendor', status: 'not_started', priority: 'med',
    });
    await db.from('board_item_links').insert({ board_item_id: input.boardItemId, target_type: 'task', target_id: taskId, created_by: input.actorUserId });
    return { targetId: vendorId, sideEffects: [{ type: 'task', id: taskId }] };
  },
  task: async (db, input, prefill) => ({ targetId: await insertReturningId(db, 'tasks', { workspace_id: input.workspaceId, created_by: input.actorUserId, ...prefill }), sideEffects: [] }),
  budget_item: async (db, input, prefill) => ({ targetId: await insertReturningId(db, 'budget_items', { workspace_id: input.workspaceId, created_by: input.actorUserId, ...prefill }), sideEffects: [] }),
  decision: async (db, input, prefill) => {
    const decisionId = await insertReturningId(db, 'decisions', { workspace_id: input.workspaceId, created_by: input.actorUserId, ...prefill });
    // Seed the first option from this board item (§5.2).
    await db.from('decision_options').insert({ decision_id: decisionId, label: (prefill.title as string) ?? 'Option', linked_board_item_id: input.boardItemId, sort: 0 });
    return { targetId: decisionId, sideEffects: [] };
  },
  event: async (db, input, prefill) => ({ targetId: await insertReturningId(db, 'events', { workspace_id: input.workspaceId, ...prefill }), sideEffects: [] }),
  document: async (db, input, prefill) => ({ targetId: await insertReturningId(db, 'documents', { workspace_id: input.workspaceId, created_by: input.actorUserId, ...prefill }), sideEffects: [] }),
  honeymoon_item: async (db, input, prefill) => ({ targetId: await insertReturningId(db, 'honeymoon_items', { workspace_id: input.workspaceId, ...prefill }), sideEffects: [] }),
  guest_experience_note: async (db, input, prefill) => {
    // Not a link_target: create a private guest_itinerary event carrying the note.
    const id = await insertReturningId(db, 'events', { workspace_id: input.workspaceId, kind: 'guest_itinerary', title: (prefill.note as string) ?? 'Guest note', visibility: 'private' });
    return { targetId: id, sideEffects: [] };
  },
};

async function audit(db: DB, workspaceId: string, actorId: string, action: string, entityType: string, entityId: string, meta: Record<string, unknown>) {
  await db.from('audit_events').insert({ workspace_id: workspaceId, actor_id: actorId, action, entity_type: entityType, entity_id: entityId, meta });
}

// --- board-type → category guesses (overridable in the confirm step) ---
function guessVendorCategory(boardType?: string): string {
  const m: Record<string, string> = { venue: 'venue', food_beverage: 'caterer', florals_decor: 'florist', photo_video: 'photographer', music_entertainment: 'dj', attire: 'attire', stationery_signage: 'stationery' };
  return (boardType && m[boardType]) || 'other';
}
function boardTypeToTaskCategory(boardType?: string): string {
  const m: Record<string, string> = { venue: 'venue', food_beverage: 'food', florals_decor: 'design', photo_video: 'vendor', attire: 'attire', ceremony: 'ceremony', reception: 'reception', honeymoon: 'honeymoon', guest_experience: 'guest' };
  return (boardType && m[boardType]) || 'venue';
}
function boardTypeToDecisionCategory(boardType?: string): string {
  const m: Record<string, string> = { venue: 'venue', food_beverage: 'menu', florals_decor: 'design', attire: 'attire', master_vision: 'design', guest_experience: 'guest', honeymoon: 'honeymoon' };
  return (boardType && m[boardType]) || 'design';
}
