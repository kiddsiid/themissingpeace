'use server';
// Add-item actions (Build Plan v2 §7 Phase 2). Membership + capability enforced.
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireWorkspaceMember } from '@/lib/workspace/current';
import { can } from '@/lib/auth/permissions';
import { fetchLinkPreview, itemTypeForUrl } from '@/lib/link-preview';
import { inferTags } from '@/lib/board/tags';

async function assertCanAdd(workspaceId: string) {
  const actor = await requireWorkspaceMember(workspaceId);
  if (!can(actor.role, 'board.add') && !can(actor.role, 'plan.full')) throw new Error('You cannot add to this board');
  return actor;
}

// Smart tagging (Board Overhaul) — infer starter tags for a new item and attach them.
// Tags live in workspace-scoped board_tags (upserted by label) + board_item_tags. Best-effort:
// tagging must never block the add.
async function applySmartTags(db: ReturnType<typeof supabaseAdmin>, args: {
  workspaceId: string; boardId: string; itemId: string;
  title?: string | null; body?: string | null; url?: string | null;
}) {
  try {
    const { data: board } = await db.from('boards').select('type').eq('id', args.boardId).single();
    const labels = inferTags({ title: args.title, body: args.body, url: args.url, boardType: (board as any)?.type });
    if (!labels.length) return;
    const { data: existing } = await db.from('board_tags').select('id, label').eq('workspace_id', args.workspaceId).in('label', labels);
    const byLabel = new Map((existing ?? []).map((t: any) => [t.label, t.id]));
    const missing = labels.filter((l) => !byLabel.has(l));
    if (missing.length) {
      const { data: created } = await db.from('board_tags')
        .insert(missing.map((label) => ({ workspace_id: args.workspaceId, label })))
        .select('id, label');
      for (const t of created ?? []) byLabel.set((t as any).label, (t as any).id);
    }
    const rows = labels.map((l) => byLabel.get(l)).filter(Boolean).map((board_tag_id) => ({ board_item_id: args.itemId, board_tag_id }));
    if (rows.length) await db.from('board_item_tags').upsert(rows, { onConflict: 'board_item_id,board_tag_id' });
  } catch { /* never block the add on tagging */ }
}

export async function addLinkItem(args: { workspaceId: string; boardId: string; url: string; collectionId?: string }) {
  const actor = await assertCanAdd(args.workspaceId);
  const db = supabaseAdmin();
  let previewId: string | null = null;
  let title: string | undefined;
  try {
    const p = await fetchLinkPreview(args.url);
    title = p.title;
    const { data: lp } = await db.from('link_previews').insert({
      canonical_url: p.canonicalUrl, title: p.title, description: p.description,
      image_url: p.imageUrl, favicon_url: p.faviconUrl, author: p.author,
      source_domain: p.sourceDomain,
      raw_meta: { ...(p.raw ?? {}), embed_url: p.embedUrl ?? null, media_kind: p.mediaKind ?? null },
    }).select('id').single();
    previewId = lp?.id ?? null;
  } catch { /* still create a bare link card */ }

  const { data: item, error } = await db.from('board_items').insert({
    workspace_id: args.workspaceId, board_id: args.boardId, collection_id: args.collectionId ?? null,
    type: itemTypeForUrl(args.url), title: title ?? args.url, source_url: args.url,
    link_preview_id: previewId, disposition: 'captured', created_by: actor.userId,
  }).select('id').single();
  if (error) throw error;
  await db.from('board_item_positions').insert({ board_item_id: item!.id, board_id: args.boardId, x: 24, y: 24, z: 0 });
  await applySmartTags(db, { workspaceId: args.workspaceId, boardId: args.boardId, itemId: item!.id, title: title ?? null, url: args.url });
  revalidatePath('/board');
  return { id: item!.id };
}

export async function addNoteItem(args: { workspaceId: string; boardId: string; title: string; body?: string; colorHex?: string }) {
  const actor = await assertCanAdd(args.workspaceId);
  const db = supabaseAdmin();
  const { data: item, error } = await db.from('board_items').insert({
    workspace_id: args.workspaceId, board_id: args.boardId,
    type: args.colorHex ? 'color_swatch' : 'note', title: args.title, body: args.body ?? null,
    color_hex: args.colorHex ?? null, disposition: 'captured', created_by: actor.userId,
  }).select('id').single();
  if (error) throw error;
  await db.from('board_item_positions').insert({ board_item_id: item!.id, board_id: args.boardId, x: 24, y: 24, z: 0 });
  await applySmartTags(db, { workspaceId: args.workspaceId, boardId: args.boardId, itemId: item!.id, title: args.title, body: args.body ?? null });
  revalidatePath('/board');
  return { id: item!.id };
}
