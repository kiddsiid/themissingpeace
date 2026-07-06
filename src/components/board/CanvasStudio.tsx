'use client';
// The Vision Studio canvas (Board Overhaul). react-moveable gives pro drag/resize/rotate
// handles with snap + alignment guides; framer-motion gives a soft entrance. Select a pin
// to manipulate it; a floating toolbar handles lock / duplicate / deselect.
import { useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

// Client-only: react-moveable touches the DOM, so keep it out of SSR.
const Moveable = dynamic(() => import('react-moveable'), { ssr: false });
import { useBoard } from '@/lib/board/store';
import { updateBoardItemPosition } from '@/app/(app)/board/position';
import { duplicateBoardItem } from '@/app/(app)/board/actions';
import { BoardItemCard } from './BoardItemCard';
import type { BoardItemView } from '@/lib/board/store';

type CursorOther = { connectionId: number; presence?: { cursor?: { x: number; y: number } | null } };
type Frame = { x: number; y: number; w: number; rot: number };

export function CanvasStudio({
  workspaceId, boardId, favOnly, others, updatePresence,
}: {
  workspaceId: string; boardId: string; favOnly: boolean;
  others: CursorOther[]; updatePresence: (p: { cursor: { x: number; y: number } | null }) => void;
}) {
  const { items, patchPos, bringToFront } = useBoard();
  const router = useRouter();
  const [, start] = useTransition();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const elMap = useRef<Record<string, HTMLDivElement | null>>({});
  const frames = useRef<Record<string, Frame>>({});

  const list = useMemo(
    () => Object.values(items).filter((i) => i.disposition !== 'archived' && (favOnly ? i.isFavorite : true)).sort((a, b) => (a.position.z ?? 0) - (b.position.z ?? 0)),
    [items, favOnly],
  );

  // Seed each item's working frame from the store once.
  for (const it of list) {
    if (!frames.current[it.id]) {
      frames.current[it.id] = { x: it.position.x, y: it.position.y, w: it.position.w ?? 220, rot: it.position.rotation ?? 0 };
    }
  }

  function applyFrame(id: string) {
    const el = elMap.current[id];
    const f = frames.current[id];
    if (!el || !f) return;
    el.style.transform = `translate(${f.x}px, ${f.y}px) rotate(${f.rot}deg)`;
    el.style.width = `${f.w}px`;
  }

  function persist(id: string) {
    const f = frames.current[id];
    const it = items[id];
    if (!f || !it) return;
    const x = Math.round(f.x), y = Math.round(f.y), w = Math.round(f.w), rotation = Math.round(f.rot);
    patchPos(id, { x, y, w, rotation });
    start(async () => {
      await updateBoardItemPosition({ workspaceId, boardId, boardItemId: id, x, y, z: it.position.z, w, rotation, pinned: it.position.pinned });
    });
  }

  function toggleLock(id: string) {
    const it = items[id];
    if (!it) return;
    const pinned = !it.position.pinned;
    patchPos(id, { pinned });
    if (pinned) setSelectedId(null);
    start(async () => {
      await updateBoardItemPosition({ workspaceId, boardId, boardItemId: id, x: it.position.x, y: it.position.y, z: it.position.z, w: it.position.w, rotation: it.position.rotation, pinned });
    });
  }
  function duplicate(id: string) { start(async () => { await duplicateBoardItem(workspaceId, id); router.refresh(); }); }

  const selectedEl = selectedId ? elMap.current[selectedId] : null;
  const guidelines = list.filter((i) => i.id !== selectedId).map((i) => elMap.current[i.id]).filter(Boolean) as HTMLElement[];
  const bounds = { left: 0, top: 0, right: sceneRef.current?.clientWidth ?? 2000, bottom: sceneRef.current?.clientHeight ?? 1400 };

  return (
    <div
      ref={sceneRef}
      className="relative mt-4 h-[72vh] min-h-[560px] select-none overflow-hidden rounded-[18px] border border-[var(--line)]"
      style={{ touchAction: 'none', background: 'radial-gradient(120% 90% at 50% 0%, #FBF6EC 0%, #F3ECDE 70%, #EFE7D6 100%)' }}
      onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); updatePresence({ cursor: { x: e.clientX - r.left, y: e.clientY - r.top } }); }}
      onPointerLeave={() => updatePresence({ cursor: null })}
      onPointerDown={(e) => { if (e.target === e.currentTarget) setSelectedId(null); }}
    >
      {selectedId && (
        <div className="absolute left-3 top-3 z-[80] flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--pearl)]/95 px-2 py-1 shadow">
          <button onClick={() => toggleLock(selectedId)} className="rounded-full px-2 py-0.5 text-xs text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]">{items[selectedId]?.position.pinned ? '🔒 Locked' : '🔓 Lock'}</button>
          <button onClick={() => duplicate(selectedId)} className="rounded-full px-2 py-0.5 text-xs text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]">⧉ Duplicate</button>
          <button onClick={() => setSelectedId(null)} className="rounded-full px-2 py-0.5 text-xs text-[var(--ink-faint)] hover:bg-[var(--gold-bg)]">✕</button>
        </div>
      )}

      {list.map((item) => {
        const f = frames.current[item.id];
        const locked = !!item.position.pinned;
        return (
          <motion.div
            key={item.id}
            ref={(el) => { elMap.current[item.id] = el; }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.35 }}
            onPointerDown={() => { setSelectedId(locked ? null : item.id); if (!locked) bringToFront(item.id); }}
            className={'absolute ' + (locked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing') + (selectedId === item.id ? ' ring-2 ring-[var(--gold)] ring-offset-2 ring-offset-transparent rounded-[16px]' : '')}
            style={{ left: 0, top: 0, width: f.w, transform: `translate(${f.x}px, ${f.y}px) rotate(${f.rot}deg)`, zIndex: item.position.z ?? 0 }}
          >
            <BoardItemCard workspaceId={workspaceId} item={item} />
          </motion.div>
        );
      })}

      {selectedEl && (
        <Moveable
          target={selectedEl}
          draggable
          resizable
          rotatable
          snappable
          origin={false}
          keepRatio={false}
          throttleDrag={0}
          throttleResize={0}
          throttleRotate={0}
          bounds={bounds}
          elementGuidelines={guidelines}
          snapThreshold={6}
          onDrag={(e) => { const f = frames.current[selectedId!]; if (!f) return; f.x = e.beforeTranslate[0]; f.y = e.beforeTranslate[1]; applyFrame(selectedId!); }}
          onDragEnd={() => persist(selectedId!)}
          onResize={(e) => { const f = frames.current[selectedId!]; if (!f) return; f.w = e.width; f.x = e.drag.beforeTranslate[0]; f.y = e.drag.beforeTranslate[1]; applyFrame(selectedId!); }}
          onResizeEnd={() => persist(selectedId!)}
          onRotate={(e) => { const f = frames.current[selectedId!]; if (!f) return; f.rot = e.beforeRotate; applyFrame(selectedId!); }}
          onRotateEnd={() => persist(selectedId!)}
        />
      )}

      {others.map((o) => {
        const c = o.presence?.cursor;
        return c ? <div key={o.connectionId} className="pointer-events-none absolute z-[70] text-[var(--clay)]" style={{ left: c.x, top: c.y }}>✦</div> : null;
      })}
    </div>
  );
}
