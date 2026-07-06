'use server';

import { can } from '@/lib/auth/permissions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { requireWorkspaceMember } from '@/lib/workspace/current';

export async function updateBoardItemPosition(args: {
  workspaceId: string;
  boardId: string;
  boardItemId: string;
  x: number;
  y: number;
  z?: number;
  w?: number;
  h?: number;
  rotation?: number;
  pinned?: boolean;
}) {
  const actor = await requireWorkspaceMember(args.workspaceId);
  if (!can(actor.role, 'board.add')) throw new Error('You do not have permission to move board items');

  const db = supabaseAdmin();
  const { data: item } = await db
    .from('board_items')
    .select('id')
    .eq('id', args.boardItemId)
    .eq('board_id', args.boardId)
    .eq('workspace_id', args.workspaceId)
    .single();
  if (!item) throw new Error('Board item not found');

  const patch: Record<string, unknown> = {
    board_item_id: args.boardItemId,
    board_id: args.boardId,
    x: args.x,
    y: args.y,
    z: args.z ?? 0,
    updated_at: new Date().toISOString(),
  };
  if (args.w !== undefined) patch.w = args.w;
  if (args.h !== undefined) patch.h = args.h;
  if (args.rotation !== undefined) patch.rotation = args.rotation;
  if (args.pinned !== undefined) patch.pinned = args.pinned;

  const { error } = await db.from('board_item_positions').upsert(patch);
  if (error) throw error;
}
