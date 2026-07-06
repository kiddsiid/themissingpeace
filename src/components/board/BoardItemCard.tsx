'use client';
// A board item card (Build Plan v2 §9) — image-forward, calm, Pinterest/Instagram feel.
// Controls bloom in on hover; favorite heart (top-right) and "added by" attribution.
import { useState, useTransition } from 'react';
import { PoofMenu } from './PoofMenu';
import { CardDrawer } from './CardDrawer';
import { toggleFavorite, setItemCollection, archiveBoardItem } from '@/app/(app)/board/actions';
import type { BoardItemView } from '@/lib/board/store';

type Collection = { id: string; name: string };

function domainOf(url?: string): string | null {
  if (!url) return null;
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return null; }
}
function initials(n?: string) { return (n || '✦').split(/\s+/).map((w) => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '✦'; }

export function BoardItemCard({ workspaceId, item, collections = [] }: { workspaceId: string; item: BoardItemView; collections?: Collection[] }) {
  const poofed = item.disposition === 'poofed';
  const source = domainOf(item.sourceUrl);
  const isVideo = item.mediaKind === 'video' || ['youtube', 'tiktok', 'vimeo'].includes(item.type);
  const [pending, start] = useTransition();
  const [moving, startMove] = useTransition();
  const [open, setOpen] = useState(false);

  return (
    <>
    {open && <CardDrawer workspaceId={workspaceId} item={item} collections={collections} onClose={() => setOpen(false)} />}
    <div className="group relative w-full overflow-hidden rounded-[14px] border border-[var(--line)] bg-[var(--pearl)] shadow-[0_2px_8px_rgba(58,54,49,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(58,54,49,0.14)]">
      <div className="relative w-full overflow-hidden bg-[var(--cream)]">
        {item.imageUrl ? (
          <>
            <img src={item.imageUrl} alt={item.title ?? ''} draggable={false} className="block w-full select-none object-cover transition-transform duration-500 group-hover:scale-[1.04]" style={{ maxHeight: 260 }} />
            {isVideo && (
              <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-black/45 text-lg text-white backdrop-blur-sm">▶</span>
              </span>
            )}
          </>
        ) : item.colorHex ? (
          <div className="flex h-32 w-full items-end justify-start p-2" style={{ background: item.colorHex }}>
            <span className="rounded-full bg-white/85 px-2 py-0.5 text-[10px] font-medium text-[var(--ink)]">{item.colorHex}</span>
          </div>
        ) : item.body ? (
          <div className="flex min-h-[7rem] w-full items-center justify-center bg-[var(--cream)] px-4 py-5 text-center">
            <span className="voice line-clamp-5 text-[16px] leading-snug text-[var(--ink)]">{item.body}</span>
          </div>
        ) : (
          <div className="flex h-28 w-full items-center gap-2.5 bg-[var(--cream)] px-4">
            {item.faviconUrl ? <img src={item.faviconUrl} alt="" className="h-6 w-6 shrink-0 rounded" /> : <span className="shrink-0 text-lg">🔗</span>}
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-[var(--ink)]">{item.title || source || 'Link'}</span>
              {source && <span className="block truncate text-[11px] text-[var(--ink-faint)]">{source}</span>}
            </span>
          </div>
        )}

        {/* favorite heart */}
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => start(async () => { await toggleFavorite(workspaceId, item.id); })}
          disabled={pending}
          aria-label={item.isFavorite ? 'Unfavorite' : 'Favorite'}
          className={'absolute right-2 top-2 rounded-full px-2 py-0.5 text-sm shadow-sm ' + (item.isFavorite ? 'bg-white text-[var(--clay)]' : 'bg-white/80 text-[var(--ink-faint)] opacity-0 group-hover:opacity-100')}
        >
          {item.isFavorite ? '♥' : '♡'}
        </button>

        {poofed && <span className="absolute left-2 top-2 rounded-full bg-[var(--gold-bg)] px-2 py-0.5 text-[10px] text-[var(--gold)] shadow-sm">✦ set in peace</span>}
        {!poofed && item.disposition === 'approved' && <span className="absolute left-2 top-2 rounded-full bg-[var(--sage-bg)] px-2 py-0.5 text-[10px] text-[var(--sage)] shadow-sm">✓ approved</span>}
        {!poofed && item.disposition === 'rejected' && <span className="absolute left-2 top-2 rounded-full bg-white/85 px-2 py-0.5 text-[10px] text-[var(--ink-faint)] shadow-sm">not now</span>}

        {/* controls bloom on hover */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/35 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
          onPointerDown={(e) => e.stopPropagation()}>
          <div className="pointer-events-auto flex items-center gap-1.5">
            <PoofMenu workspaceId={workspaceId} boardItemId={item.id} />
            <button onClick={() => setOpen(true)} className="rounded-full bg-white/90 px-2.5 py-1 text-xs text-[var(--clay-ink)] hover:bg-white" title="Open — vote, comment, approve">⤢ open</button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => start(async () => { await archiveBoardItem(workspaceId, item.id); })}
              className="ml-auto rounded-full bg-white/90 px-2.5 py-1 text-xs text-[var(--ink-faint)] hover:bg-white hover:text-[var(--clay-ink)]"
              title="Set aside"
            >
              🥀
            </button>
          </div>
        </div>
      </div>

      {(item.title || source || item.addedByName || collections.length > 0) && (
        <div className="px-3 py-2">
          {item.title && <p className="truncate text-[13px] text-[var(--ink)]" title={item.title}>{item.title}</p>}
          <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-[var(--ink-faint)]">
            {item.addedByName && (
              <span className="inline-flex items-center gap-1">
                {item.addedByAvatar
                  ? <img src={item.addedByAvatar} alt="" className="h-3.5 w-3.5 rounded-full object-cover" />
                  : <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[var(--gold-bg)] text-[7px] text-[var(--gold)]">{initials(item.addedByName)}</span>}
                {item.addedByName}
              </span>
            )}
            {item.addedByName && source && <span>·</span>}
            {source && <span className="truncate">{source}</span>}
          </div>
          {collections.length > 0 && (
            <select
              value={item.collectionId ?? ''}
              disabled={moving}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) => { const v = e.target.value; startMove(async () => { await setItemCollection(workspaceId, item.id, v || null); }); }}
              className="mt-1.5 w-full rounded-full border border-[var(--line)] bg-white px-2.5 py-1 text-[11px] text-[var(--ink-soft)] outline-none focus:border-[var(--gold)]"
              aria-label="Move to section"
            >
              <option value="">To sort</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
      )}
    </div>
    </>
  );
}
