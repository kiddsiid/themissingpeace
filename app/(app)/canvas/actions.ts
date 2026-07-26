'use server';

import { revalidatePath } from 'next/cache';
import { can } from '@/lib/auth/permissions';
import { loadCanvasBoard, saveCanvasBoard } from '@/lib/canvas/store';
import type { RoomKey } from '@/lib/canvas/types';
import { requireActiveWorkspace } from '@/lib/workspace/current';

const ROOMS = new Set<RoomKey>(['feast', 'atmosphere', 'atelier']);

/** Links a Dream Drawer inspiration to a room without deleting its provenance. */
export async function linkDreamItemToRoom(itemId: string, room: RoomKey) {
  const workspace = await requireActiveWorkspace();
  if (!can(workspace.role, 'plan.full')) throw new Error('You do not have permission to link Dream items');
  if (!itemId || !ROOMS.has(room)) throw new Error('Invalid Dream link');
  const { board } = await loadCanvasBoard(workspace.id);
  const item = board.inspirations.find((entry) => entry.id === itemId);
  if (!item) throw new Error('Dream item not found');
  item.room = room;
  await saveCanvasBoard(workspace.id, board);
  revalidatePath('/canvas');
}
