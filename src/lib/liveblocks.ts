// Liveblocks config for the board (Build Plan v2 §3). Postgres remains the system of
// record; Liveblocks holds ephemeral positions/presence and is persisted back (debounced).
import { createClient } from '@liveblocks/client';

export const liveblocks = createClient({
  // NOTE (Codex): use an auth endpoint that checks workspace membership before
  // issuing a room token. Room id convention: `board:{boardId}`.
  authEndpoint: '/api/liveblocks-auth',
});

export type Presence = { cursor: { x: number; y: number } | null; viewingItemId?: string | null };
export type BoardStorage = {
  // mirror of board_item_positions while a room is live
  positions: Record<string, { x: number; y: number; w?: number; h?: number; z: number; rotation: number; groupId?: string; pinned: boolean }>;
};
