'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LiveblocksProvider, RoomProvider, useOthers, useUpdateMyPresence } from '@liveblocks/react';
import { addLinkItem } from '@/app/(app)/board/add-item';
import { uploadBoardFile } from '@/app/(app)/board/upload';
import { restoreBoardItem, deleteBoardItemForever } from '@/app/(app)/board/actions';
import { useBoard } from '@/lib/board/store';
import { BoardItemCard } from './BoardItemCard';
import { CanvasStudio } from './CanvasStudio';
import type { BoardItemView } from '@/lib/board/store';

function AddBar({ workspaceId, boardId }: { workspaceId: string; boardId: string }) {
  const [url, setUrl] = useState('');
  const [dragging, setDragging] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  function add() {
    if (!url.trim()) return;
    start(async () => {
      await addLinkItem({ workspaceId, boardId, url: url.trim() });
      setUrl('');
      router.refresh();
    });
  }

  function upload(files: FileList | File[]) {
    const list = Array.from(files).filter((file) => file.type.startsWith('image/') || file.type === 'application/pdf');
    if (!list.length) return;
    start(async () => {
      for (const file of list) {
        const formData = new FormData();
        formData.set('workspaceId', workspaceId);
        formData.set('boardId', boardId);
        formData.set('file', file);
        await uploadBoardFile(formData);
      }
      router.refresh();
    });
  }

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragging(false);
        upload(event.dataTransfer.files);
      }}
      className={
        'flex flex-1 flex-wrap items-center gap-2 rounded-[14px] border border-dashed px-2 py-2 transition-colors ' +
        (dragging ? 'border-[var(--clay)] bg-[var(--clay-bg)]' : 'border-transparent')
      }
    >
      <input
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter') add(); }}
        placeholder="Paste a Pinterest, vendor, or inspiration link"
        className="min-w-[200px] flex-1 rounded-full border border-[var(--line)] bg-[var(--pearl)] px-4 py-2 text-sm outline-none focus:border-[var(--gold)]"
      />
      <button onClick={add} disabled={pending} className="rounded-full bg-[var(--clay)] px-5 py-2 text-sm text-white disabled:opacity-60">{pending ? 'Adding...' : 'Add'}</button>
      <label className="cursor-pointer rounded-full border border-[#D8C7A6] px-4 py-2 text-sm text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]">
        Upload
        <input
          type="file"
          name="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={(event) => {
            if (event.currentTarget.files) upload(event.currentTarget.files);
            event.currentTarget.value = '';
          }}
        />
      </label>
      <span className="text-[11px] text-[var(--ink-faint)]">Drop images or PDFs here</span>
    </div>
  );
}

function LivePresence() {
  const others = useOthers();
  if (others.length === 0) return <span className="text-[11px] text-[var(--ink-faint)]">just you, for now</span>;
  return <span className="flex items-center gap-1 text-[11px] text-[var(--ink-faint)]"><span className="inline-block h-2 w-2 rounded-full bg-[var(--sage)]" /> {others.length} here with you</span>;
}

function useFiltered(favOnly: boolean): BoardItemView[] {
  const { items } = useBoard();
  return useMemo(() => Object.values(items).filter((item) => item.disposition !== 'archived' && (favOnly ? item.isFavorite : true)), [items, favOnly]);
}

function TrashView({ workspaceId }: { workspaceId: string }) {
  const { items } = useBoard();
  const router = useRouter();
  const [, start] = useTransition();
  const trashed = useMemo(() => Object.values(items).filter((i) => i.disposition === 'archived'), [items]);
  if (trashed.length === 0) return <p className="mt-6 text-sm text-[var(--ink-faint)]">Nothing set aside. Fragments you set aside rest here — bring them back anytime, or let them go for good.</p>;
  return (
    <div className="mt-4 space-y-2">
      <p className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Set aside</p>
      {trashed.map((item) => (
        <div key={item.id} className="flex items-center gap-3 rounded-[12px] border border-[var(--line)] bg-[var(--pearl)] p-2.5">
          {item.imageUrl ? <img src={item.imageUrl} alt="" className="h-10 w-10 rounded object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded bg-[var(--cream)] text-[12px]">🥀</div>}
          <span className="min-w-0 flex-1 truncate text-sm">{item.title || item.sourceUrl || 'Untitled fragment'}</span>
          <button onClick={() => start(async () => { await restoreBoardItem(workspaceId, item.id); router.refresh(); })} className="rounded-full border border-[var(--line)] px-3 py-1 text-xs text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]">Bring back</button>
          <button onClick={() => start(async () => { await deleteBoardItemForever(workspaceId, item.id); router.refresh(); })} className="rounded-full px-3 py-1 text-xs text-[var(--clay-ink)] hover:bg-[var(--clay-bg)]">Let go</button>
        </div>
      ))}
    </div>
  );
}

type Collection = { id: string; name: string; sort: number };
type BoardRef = { id: string; title: string; type: string };

function Masonry({ workspaceId, items, collections }: { workspaceId: string; items: BoardItemView[]; collections: Collection[] }) {
  // Stable CSS grid (not `columns`) so cards never reflow/resize on scroll.
  return (
    <div className="mt-3 grid grid-cols-2 items-start gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item) => <BoardItemCard key={item.id} workspaceId={workspaceId} item={item} collections={collections} />)}
    </div>
  );
}

function Gallery({ workspaceId, favOnly, collections }: { workspaceId: string; favOnly: boolean; collections: Collection[] }) {
  const list = useFiltered(favOnly);
  if (list.length === 0) {
    return <p className="mt-6 text-sm text-[var(--ink-faint)]">{favOnly ? 'No favorites yet. Mark a fragment as favorite to see it here.' : 'Your fragments will gather here. Paste a link, upload, or drop a file to begin.'}</p>;
  }
  const byCollection = new Map<string | null, BoardItemView[]>();
  for (const item of list) {
    const key = item.collectionId ?? null;
    if (!byCollection.has(key)) byCollection.set(key, []);
    byCollection.get(key)!.push(item);
  }
  const unsorted = byCollection.get(null) ?? [];
  const anySectioned = collections.some((c) => (byCollection.get(c.id) ?? []).length > 0);

  // No sections used yet → keep the calm single masonry.
  if (!anySectioned) return <Masonry workspaceId={workspaceId} items={list} collections={collections} />;

  return (
    <div className="mt-4 space-y-6">
      {collections.map((c) => {
        const group = byCollection.get(c.id) ?? [];
        if (group.length === 0) return null;
        return (
          <section key={c.id}>
            <h3 className="voice text-lg text-[var(--ink)]">{c.name} <span className="text-xs text-[var(--ink-faint)]">· {group.length}</span></h3>
            <Masonry workspaceId={workspaceId} items={group} collections={collections} />
          </section>
        );
      })}
      {unsorted.length > 0 && (
        <section>
          <h3 className="voice text-lg text-[var(--ink-soft)]">To sort <span className="text-xs text-[var(--ink-faint)]">· {unsorted.length}</span></h3>
          <Masonry workspaceId={workspaceId} items={unsorted} collections={collections} />
        </section>
      )}
    </div>
  );
}

function BoardSwitcher({ boards, activeBoardId }: { boards: BoardRef[]; activeBoardId?: string }) {
  if (boards.length <= 1) return null;
  return (
    <div className="mb-4 flex flex-wrap gap-1.5">
      {boards.map((b) => (
        <Link
          key={b.id}
          href={`/board?board=${b.id}`}
          scroll={false}
          className={'whitespace-nowrap rounded-full px-3 py-1 text-xs transition-all hover:-translate-y-0.5 ' + (b.id === activeBoardId ? 'bg-[var(--clay)] text-white shadow-sm' : 'border border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]')}
        >
          {b.title}
        </Link>
      ))}
    </div>
  );
}

type CursorOther = { connectionId: number; presence?: { cursor?: { x: number; y: number } | null } };

// (legacy CanvasBoard removed — Canvas now renders <CanvasStudio/>)

// Liveblocks-backed canvas — only mounted when realtime is on (hooks require a RoomProvider).
function LiveCanvas(props: { workspaceId: string; boardId: string; favOnly: boolean }) {
  const updatePresence = useUpdateMyPresence();
  const others = useOthers() as unknown as CursorOther[];
  return <CanvasStudio {...props} others={others} updatePresence={updatePresence} />;
}

// Plain canvas — no realtime, no Liveblocks hooks.
function PlainCanvas(props: { workspaceId: string; boardId: string; favOnly: boolean }) {
  return <CanvasStudio {...props} others={[]} updatePresence={() => {}} />;
}

export function BoardView({
  workspaceId, boardId, boards = [], activeBoardId, collections = [], initialItems = [], realtime = false,
}: {
  workspaceId: string; boardId: string;
  boards?: BoardRef[]; activeBoardId?: string; collections?: Collection[];
  initialItems?: BoardItemView[]; realtime?: boolean;
}) {
  const { setItems } = useBoard();
  const [view, setView] = useState<'gallery' | 'canvas' | 'trash'>('gallery');
  const [favOnly, setFavOnly] = useState(false);
  const [fileDrag, setFileDrag] = useState(0); // depth counter — child enter/leave events balance out
  const [, startUpload] = useTransition();
  const router = useRouter();
  useEffect(() => { setItems(initialItems); }, [initialItems, setItems]);

  // Whole-board drop target (Board Overhaul) — drop images/PDFs anywhere, not just the add bar.
  function isFileDrag(event: React.DragEvent) {
    return Array.from(event.dataTransfer?.types ?? []).includes('Files');
  }
  function dropFiles(files: FileList) {
    const list = Array.from(files).filter((file) => file.type.startsWith('image/') || file.type === 'application/pdf');
    if (!list.length) return;
    startUpload(async () => {
      for (const file of list) {
        const formData = new FormData();
        formData.set('workspaceId', workspaceId);
        formData.set('boardId', boardId);
        formData.set('file', file);
        await uploadBoardFile(formData);
      }
      router.refresh();
    });
  }

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <AddBar workspaceId={workspaceId} boardId={boardId} />
      <div className="flex items-center gap-3">
        {realtime ? <LivePresence /> : <span className="text-[11px] text-[var(--ink-faint)]">just you</span>}
        <button
          onClick={() => setFavOnly((value) => !value)}
          className={'rounded-full px-3 py-1 text-xs ' + (favOnly ? 'bg-[var(--clay-bg)] text-[var(--clay-ink)]' : 'border border-[var(--line)] text-[var(--ink-soft)]')}
        >
          {favOnly ? 'favorites only' : 'favorites'}
        </button>
        <div className="flex rounded-full border border-[var(--line)] p-0.5 text-xs">
          <button onClick={() => setView('gallery')} className={'rounded-full px-3 py-1 ' + (view === 'gallery' ? 'bg-[var(--clay-bg)] text-[var(--clay-ink)]' : 'text-[var(--ink-soft)]')}>Gallery</button>
          <button onClick={() => setView('canvas')} className={'rounded-full px-3 py-1 ' + (view === 'canvas' ? 'bg-[var(--clay-bg)] text-[var(--clay-ink)]' : 'text-[var(--ink-soft)]')}>Canvas</button>
          <button onClick={() => setView('trash')} title="Set aside" className={'rounded-full px-3 py-1 ' + (view === 'trash' ? 'bg-[var(--clay-bg)] text-[var(--clay-ink)]' : 'text-[var(--ink-soft)]')}>🥀</button>
        </div>
      </div>
    </div>
  );

  const body = (
    <div
      className="relative"
      onDragEnter={(event) => { if (isFileDrag(event)) { event.preventDefault(); setFileDrag((d) => d + 1); } }}
      onDragOver={(event) => { if (isFileDrag(event)) event.preventDefault(); }}
      onDragLeave={(event) => { if (isFileDrag(event)) setFileDrag((d) => Math.max(0, d - 1)); }}
      onDrop={(event) => {
        if (!isFileDrag(event)) return;
        event.preventDefault();
        setFileDrag(0);
        dropFiles(event.dataTransfer.files);
      }}
    >
      <BoardSwitcher boards={boards} activeBoardId={activeBoardId} />
      {toolbar}
      {view === 'trash'
        ? <TrashView workspaceId={workspaceId} />
        : view === 'gallery'
          ? <Gallery workspaceId={workspaceId} favOnly={favOnly} collections={collections} />
          : realtime
            ? <LiveCanvas workspaceId={workspaceId} boardId={boardId} favOnly={favOnly} />
            : <PlainCanvas workspaceId={workspaceId} boardId={boardId} favOnly={favOnly} />}
      {fileDrag > 0 && (
        <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center rounded-[18px] border-2 border-dashed border-[var(--gold)] bg-[var(--gold-bg)]/80 backdrop-blur-[2px]">
          <div className="text-center">
            <p className="text-3xl">✦</p>
            <p className="voice mt-1 text-xl text-[var(--ink)]">Let it fall onto the board</p>
            <p className="text-xs text-[var(--ink-soft)]">Images and PDFs become fragments</p>
          </div>
        </div>
      )}
    </div>
  );

  if (!realtime) return <div>{body}</div>;

  return (
    <LiveblocksProvider authEndpoint="/api/liveblocks-auth">
      <RoomProvider id={`board:${boardId}`} initialPresence={{ cursor: null }}>
        {body}
      </RoomProvider>
    </LiveblocksProvider>
  );
}
