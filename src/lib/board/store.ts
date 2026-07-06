// Board client state (Build Plan v2 §3 — Zustand). Holds the in-session view of items +
// positions; authoritative data is Postgres, live positions sync via Liveblocks.
import { create } from 'zustand';

export interface BoardItemView {
  id: string; type: string; title?: string; body?: string; colorHex?: string;
  sourceUrl?: string; imageUrl?: string; embedUrl?: string; mediaKind?: string;
  faviconUrl?: string; disposition: string; collectionId?: string;
  isFavorite?: boolean; addedByName?: string; addedByAvatar?: string;
  position: { x: number; y: number; w?: number; h?: number; z: number; rotation?: number; pinned?: boolean };
}

type PosPatch = Partial<BoardItemView['position']>;

interface BoardState {
  items: Record<string, BoardItemView>;
  selectedId: string | null;
  setItems: (items: BoardItemView[]) => void;
  upsert: (item: BoardItemView) => void;
  move: (id: string, x: number, y: number) => void;
  patchPos: (id: string, p: PosPatch) => void;
  bringToFront: (id: string) => void;
  select: (id: string | null) => void;
}

export const useBoard = create<BoardState>((set) => ({
  items: {},
  selectedId: null,
  setItems: (items) => set({ items: Object.fromEntries(items.map((i) => [i.id, i])) }),
  upsert: (item) => set((s) => ({ items: { ...s.items, [item.id]: item } })),
  move: (id, x, y) => set((s) => (s.items[id] ? { items: { ...s.items, [id]: { ...s.items[id], position: { ...s.items[id].position, x, y } } } } : s)),
  patchPos: (id, p) => set((s) => (s.items[id] ? { items: { ...s.items, [id]: { ...s.items[id], position: { ...s.items[id].position, ...p } } } } : s)),
  bringToFront: (id) => set((s) => {
    if (!s.items[id]) return s;
    const maxZ = Math.max(0, ...Object.values(s.items).map((i) => i.position.z ?? 0));
    return { items: { ...s.items, [id]: { ...s.items[id], position: { ...s.items[id].position, z: maxZ + 1 } } } };
  }),
  select: (id) => set({ selectedId: id }),
}));
