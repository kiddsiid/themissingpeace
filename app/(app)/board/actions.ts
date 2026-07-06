'use server';
// Server actions for the Board → Poof flow (Build Plan v2 §5). Resolves the
// authenticated actor (Clerk) to a users.id + workspace role, then delegates to the
// Poof engine. The confirm step calls getPoofPrefill first to show editable defaults.
import { supabaseAdmin } from '@/lib/supabase/admin';
import { poofBoardItem, unpoof, prefillFor, type PoofPrefill } from '@/lib/poof';
import type { PoofTarget, MemberRole } from '@/lib/types';
import { requireWorkspaceMember, requireActiveWorkspace } from '@/lib/workspace/current';
import { revalidatePath } from 'next/cache';
import boardsSeed from '@/lib/seed/boards.json';

// Seed the default boards + section collections for the active workspace, if none exist yet.
// Self-heals workspaces whose "Generate Workspace" step never ran (e.g. after a DB reset).
export async function seedBoards() {
  const ws = await requireActiveWorkspace();
  const db = supabaseAdmin();
  const { count } = await db.from('boards').select('id', { count: 'exact', head: true }).eq('workspace_id', ws.id);
  if (count && count > 0) { revalidatePath('/board'); return; }
  const boards = boardsSeed.boards;
  for (let i = 0; i < boards.length; i++) {
    const b = boards[i];
    const { data: board, error } = await db
      .from('boards')
      .insert({ workspace_id: ws.id, type: b.type, title: b.title, is_optional: b.optional, sort: i })
      .select('id')
      .single();
    if (error) throw error;
    const collections = boardsSeed.collections.map((name, sort) => ({ board_id: board!.id, name, sort }));
    await db.from('board_collections').insert(collections);
  }
  revalidatePath('/board');
}

async function resolveActor(workspaceId: string): Promise<{ userId: string; role: MemberRole }> {
  const actor = await requireWorkspaceMember(workspaceId);
  return { userId: actor.userId, role: actor.role };
}

export async function getPoofPrefill(workspaceId: string, boardItemId: string, target: PoofTarget): Promise<PoofPrefill> {
  await resolveActor(workspaceId);
  const db = supabaseAdmin();
  const { data: item } = await db
    .from('board_items')
    .select('title, body, source_url, board:boards(type)')
    .eq('workspace_id', workspaceId)
    .eq('id', boardItemId)
    .single();
  return prefillFor[target]({
    title: item?.title ?? undefined,
    body: item?.body ?? undefined,
    sourceUrl: (item as any)?.source_url ?? undefined,
    boardType: (item as any)?.board?.type,
  });
}

export async function poofAction(args: { workspaceId: string; boardItemId: string; target: PoofTarget; overrides?: Record<string, unknown> }) {
  const { userId, role } = await resolveActor(args.workspaceId);
  return poofBoardItem({ ...args, actorUserId: userId, actorRole: role });
}

export async function unpoofAction(workspaceId: string, linkId: string) {
  const { userId } = await resolveActor(workspaceId);
  return unpoof(workspaceId, userId, linkId);
}

export async function toggleFavorite(workspaceId: string, boardItemId: string) {
  await resolveActor(workspaceId);
  const db = supabaseAdmin();
  const { data: item } = await db.from('board_items').select('is_favorite').eq('workspace_id', workspaceId).eq('id', boardItemId).single();
  await db.from('board_items').update({ is_favorite: !item?.is_favorite }).eq('workspace_id', workspaceId).eq('id', boardItemId);
  revalidatePath('/board');
}

// Move an item into one of the board's sections (board_collections), or clear it (null).
export async function setItemCollection(workspaceId: string, boardItemId: string, collectionId: string | null) {
  await resolveActor(workspaceId);
  const db = supabaseAdmin();
  await db.from('board_items').update({ collection_id: collectionId }).eq('workspace_id', workspaceId).eq('id', boardItemId);
  revalidatePath('/board');
}

// Toggle the current member's vote on a board item (board_votes is unique per user+item).
export async function voteBoardItem(workspaceId: string, boardItemId: string) {
  const { userId } = await resolveActor(workspaceId);
  const db = supabaseAdmin();
  const { data: existing } = await db.from('board_votes').select('id').eq('board_item_id', boardItemId).eq('user_id', userId).maybeSingle();
  if (existing) await db.from('board_votes').delete().eq('id', existing.id);
  else await db.from('board_votes').insert({ board_item_id: boardItemId, user_id: userId, value: 1 });
  return { voted: !existing };
}

// Add a comment to a board item.
export async function addComment(workspaceId: string, boardItemId: string, body: string) {
  const { userId } = await resolveActor(workspaceId);
  const text = body.trim();
  if (!text) throw new Error('Comment is empty');
  const db = supabaseAdmin();
  const { data, error } = await db.from('board_comments').insert({ board_item_id: boardItemId, author_id: userId, body: text }).select('id, created_at').single();
  if (error) throw error;
  return { id: data!.id as string, at: data!.created_at as string };
}

// Load a board item's collaboration detail: comments (with author names), vote count,
// whether I voted, and the item's tags (smart-inferred or hand-added; always editable).
export async function getBoardItemDetail(workspaceId: string, boardItemId: string) {
  const { userId } = await resolveActor(workspaceId);
  const db = supabaseAdmin();
  const [commentsRes, countRes, mineRes, tagsRes] = await Promise.all([
    db.from('board_comments').select('id, body, author_id, created_at').eq('board_item_id', boardItemId).order('created_at', { ascending: true }),
    db.from('board_votes').select('id', { count: 'exact', head: true }).eq('board_item_id', boardItemId),
    db.from('board_votes').select('id').eq('board_item_id', boardItemId).eq('user_id', userId).maybeSingle(),
    db.from('board_item_tags').select('tag:board_tags(id, label)').eq('board_item_id', boardItemId),
  ]);
  const comments = commentsRes.data ?? [];
  const authorIds = [...new Set(comments.map((c: any) => c.author_id))] as string[];
  const usersRes = authorIds.length ? await db.from('users').select('id, name, display_name').in('id', authorIds) : { data: [] as any[] };
  const nameById = new Map((usersRes.data ?? []).map((u: any) => [u.id, u.display_name || u.name || 'Someone']));
  return {
    comments: comments.map((c: any) => ({ id: c.id, body: c.body, author: nameById.get(c.author_id) || 'Someone', at: c.created_at })),
    voteCount: countRes.count ?? 0,
    myVote: !!mineRes.data,
    tags: (tagsRes.data ?? [])
      .map((r: any) => r.tag)
      .filter(Boolean)
      .map((t: any) => ({ id: t.id as string, label: t.label as string }))
      .sort((a: { label: string }, b: { label: string }) => a.label.localeCompare(b.label)),
  };
}

// Add a tag (by label) to an item — reuses the workspace tag row if it exists.
export async function addItemTag(workspaceId: string, boardItemId: string, label: string) {
  await resolveActor(workspaceId);
  const clean = label.trim().toLowerCase().slice(0, 40);
  if (!clean) throw new Error('Tag is empty');
  const db = supabaseAdmin();
  const { data: existing } = await db.from('board_tags').select('id').eq('workspace_id', workspaceId).eq('label', clean).maybeSingle();
  let tagId = existing?.id as string | undefined;
  if (!tagId) {
    const { data: created, error } = await db.from('board_tags').insert({ workspace_id: workspaceId, label: clean }).select('id').single();
    if (error) throw error;
    tagId = created!.id as string;
  }
  await db.from('board_item_tags').upsert({ board_item_id: boardItemId, board_tag_id: tagId }, { onConflict: 'board_item_id,board_tag_id' });
  return { id: tagId, label: clean };
}

// Remove a tag from an item (the workspace tag row itself is kept for reuse).
export async function removeItemTag(workspaceId: string, boardItemId: string, tagId: string) {
  await resolveActor(workspaceId);
  const db = supabaseAdmin();
  await db.from('board_item_tags').delete().eq('board_item_id', boardItemId).eq('board_tag_id', tagId);
}

// Duplicate a pin (content + a slightly offset position) so users can riff on a fragment.
export async function duplicateBoardItem(workspaceId: string, boardItemId: string) {
  const { userId } = await resolveActor(workspaceId);
  const db = supabaseAdmin();
  const { data: src } = await db.from('board_items')
    .select('board_id, collection_id, type, title, body, color_hex, source_url, link_preview_id, upload_id')
    .eq('workspace_id', workspaceId).eq('id', boardItemId).single();
  if (!src) return;
  const { data: copy, error } = await db.from('board_items').insert({
    workspace_id: workspaceId, board_id: src.board_id, collection_id: src.collection_id,
    type: src.type, title: src.title, body: src.body, color_hex: src.color_hex,
    source_url: src.source_url, link_preview_id: src.link_preview_id, upload_id: src.upload_id,
    disposition: 'captured', created_by: userId,
  }).select('id').single();
  if (error) throw error;
  const { data: pos } = await db.from('board_item_positions').select('x, y, z, w, h, rotation').eq('board_item_id', boardItemId).maybeSingle();
  await db.from('board_item_positions').insert({
    board_item_id: copy!.id, board_id: src.board_id,
    x: (pos?.x ?? 24) + 28, y: (pos?.y ?? 24) + 28, z: (pos?.z ?? 0) + 1, w: pos?.w, h: pos?.h, rotation: pos?.rotation ?? 0,
  });
  revalidatePath('/board');
}

// Soft-delete a pin: move it to the Trash (disposition 'archived'). Keeps poof links intact.
export async function archiveBoardItem(workspaceId: string, boardItemId: string) {
  await resolveActor(workspaceId);
  const db = supabaseAdmin();
  await db.from('board_items').update({ disposition: 'archived', updated_at: new Date().toISOString() }).eq('workspace_id', workspaceId).eq('id', boardItemId);
  revalidatePath('/board');
}

// Restore a pin from the Trash back to the board.
export async function restoreBoardItem(workspaceId: string, boardItemId: string) {
  await resolveActor(workspaceId);
  const db = supabaseAdmin();
  await db.from('board_items').update({ disposition: 'captured', updated_at: new Date().toISOString() }).eq('workspace_id', workspaceId).eq('id', boardItemId);
  revalidatePath('/board');
}

// Permanently delete a pin (row + positions/comments/votes/links cascade). Irreversible.
export async function deleteBoardItemForever(workspaceId: string, boardItemId: string) {
  await resolveActor(workspaceId);
  const db = supabaseAdmin();
  await db.from('board_items').delete().eq('workspace_id', workspaceId).eq('id', boardItemId);
  revalidatePath('/board');
}

// Set an item's disposition (approve / reject / reset). Records approver on approve.
export async function setDisposition(workspaceId: string, boardItemId: string, disposition: 'approved' | 'rejected' | 'captured') {
  const { userId } = await resolveActor(workspaceId);
  const db = supabaseAdmin();
  const patch: Record<string, unknown> = { disposition, updated_at: new Date().toISOString() };
  if (disposition === 'approved') { patch.approved_by = userId; patch.approved_at = new Date().toISOString(); }
  else { patch.approved_by = null; patch.approved_at = null; }
  await db.from('board_items').update(patch).eq('workspace_id', workspaceId).eq('id', boardItemId);
  revalidatePath('/board');
}
