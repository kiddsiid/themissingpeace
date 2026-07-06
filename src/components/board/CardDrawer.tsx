'use client';
// Card detail drawer — the collaboration hub for a single fragment.
// Lazy-loads comments + vote state, and lets the couple vote, comment, approve/reject,
// move to a section, or poof it into the plan. Slides in for a little magic.
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { getBoardItemDetail, addComment, voteBoardItem, setDisposition, setItemCollection, addItemTag, removeItemTag } from '@/app/(app)/board/actions';
import { attachItemImage } from '@/app/(app)/board/upload';
import { PoofMenu } from './PoofMenu';
import type { BoardItemView } from '@/lib/board/store';

type Collection = { id: string; name: string };
type Comment = { id: string; body: string; author: string; at: string };
type Tag = { id: string; label: string };
type Disp = 'approved' | 'rejected' | 'captured';

export function CardDrawer({
  workspaceId, item, collections = [], onClose,
}: {
  workspaceId: string; item: BoardItemView; collections?: Collection[]; onClose: () => void;
}) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[]>([]);
  const [voteCount, setVoteCount] = useState(0);
  const [myVote, setMyVote] = useState(false);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);
  const [tagText, setTagText] = useState('');
  const [, start] = useTransition();
  const [disp, setDisp] = useState<string>(item.disposition);

  useEffect(() => {
    let live = true;
    getBoardItemDetail(workspaceId, item.id)
      .then((d) => { if (!live) return; setComments(d.comments); setVoteCount(d.voteCount); setMyVote(d.myVote); setTags(d.tags ?? []); setLoading(false); })
      .catch(() => live && setLoading(false));
    return () => { live = false; };
  }, [workspaceId, item.id]);

  function toggleVote() {
    start(async () => {
      const r = await voteBoardItem(workspaceId, item.id);
      setMyVote(r.voted);
      setVoteCount((c) => Math.max(0, c + (r.voted ? 1 : -1)));
    });
  }
  function submitComment() {
    const b = text.trim();
    if (!b) return;
    start(async () => {
      const r = await addComment(workspaceId, item.id, b);
      setComments((cs) => [...cs, { id: r.id, body: b, author: 'You', at: r.at }]);
      setText('');
    });
  }
  function decide(d: Disp) {
    start(async () => { await setDisposition(workspaceId, item.id, d); setDisp(d); router.refresh(); });
  }
  function move(cid: string) {
    start(async () => { await setItemCollection(workspaceId, item.id, cid || null); router.refresh(); });
  }
  function submitTag() {
    const label = tagText.trim();
    if (!label) return;
    start(async () => {
      const t = await addItemTag(workspaceId, item.id, label);
      setTags((ts) => (ts.some((x) => x.id === t.id) ? ts : [...ts, t].sort((a, b) => a.label.localeCompare(b.label))));
      setTagText('');
    });
  }
  function dropTag(tagId: string) {
    start(async () => {
      await removeItemTag(workspaceId, item.id, tagId);
      setTags((ts) => ts.filter((t) => t.id !== tagId));
    });
  }
  function pickImage(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    start(async () => {
      const fd = new FormData();
      fd.set('workspaceId', workspaceId);
      fd.set('boardItemId', item.id);
      fd.set('file', file);
      await attachItemImage(fd);
      router.refresh();
    });
  }

  const source = (() => { try { return item.sourceUrl ? new URL(item.sourceUrl).hostname.replace(/^www\./, '') : null; } catch { return null; } })();

  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-50 bg-black/25" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.aside
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-y-auto bg-[var(--pearl)] shadow-2xl"
        initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}
      >
        <div className="flex items-start justify-between gap-3 p-5 pb-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--ink-faint)]">Fragment</p>
            <h2 className="voice text-2xl leading-tight">{item.title || source || 'Untitled'}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-full px-2 py-0.5 text-lg text-[var(--ink-faint)] hover:text-[var(--ink)]">×</button>
        </div>

        {item.embedUrl ? (
          <div className="px-5">
            <div className="relative w-full overflow-hidden rounded-[14px]" style={{ paddingTop: '56.25%' }}>
              <iframe
                src={item.embedUrl}
                title={item.title || 'embedded media'}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 h-full w-full border-0"
              />
            </div>
          </div>
        ) : (item.imageUrl || item.colorHex) ? (
          <div className="px-5">
            {item.imageUrl
              ? <img src={item.imageUrl} alt="" className="max-h-64 w-full rounded-[14px] object-cover" />
              : <div className="h-28 w-full rounded-[14px]" style={{ background: item.colorHex }} />}
          </div>
        ) : (
          <div className="px-5">
            <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-[14px] border border-dashed border-[var(--line)] bg-[var(--cream)] px-4 py-8 text-center text-sm text-[var(--ink-soft)] transition-colors hover:border-[var(--gold)]">
              <span className="text-2xl">🖼️</span>
              <span>{item.sourceUrl ? "This link didn't share a preview. Add an image or screenshot to make it beautiful." : 'Add an image or screenshot.'}</span>
              <input type="file" accept="image/*" className="hidden" onChange={(e) => pickImage(e.currentTarget.files)} />
            </label>
          </div>
        )}
        {item.body && <p className="voice px-5 pt-3 text-[15px] text-[var(--ink-soft)]">{item.body}</p>}

        <div className="flex flex-wrap items-center gap-2 p-5 pt-4">
          <button
            onClick={toggleVote}
            className={'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm transition-transform hover:-translate-y-0.5 ' + (myVote ? 'bg-[var(--clay-bg)] text-[var(--clay-ink)]' : 'border border-[var(--line)] text-[var(--ink-soft)]')}
          >
            {myVote ? '♥' : '♡'} {voteCount > 0 ? voteCount : 'Vote'}
          </button>
          <button onClick={() => decide('approved')} className={'rounded-full px-3 py-1.5 text-sm transition-transform hover:-translate-y-0.5 ' + (disp === 'approved' ? 'bg-[var(--sage)] text-white' : 'border border-[var(--line)] text-[var(--ink-soft)]')}>✓ Approve</button>
          <button onClick={() => decide(disp === 'rejected' ? 'captured' : 'rejected')} className={'rounded-full px-3 py-1.5 text-sm transition-transform hover:-translate-y-0.5 ' + (disp === 'rejected' ? 'bg-[var(--clay)] text-white' : 'border border-[var(--line)] text-[var(--ink-soft)]')}>Not now</button>
          <PoofMenu workspaceId={workspaceId} boardItemId={item.id} onDone={() => router.refresh()} />
        </div>

        <div className="px-5 pb-1">
          <label className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Tags</label>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {tags.map((t) => (
              <span key={t.id} className="group inline-flex items-center gap-1 rounded-full bg-[var(--gold-bg)] px-2.5 py-1 text-xs text-[var(--ink-soft)]">
                {t.label}
                <button onClick={() => dropTag(t.id)} aria-label={`Remove tag ${t.label}`} className="text-[var(--ink-faint)] opacity-60 transition-opacity hover:text-[var(--clay-ink)] group-hover:opacity-100">×</button>
              </span>
            ))}
            <input
              value={tagText}
              onChange={(e) => setTagText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitTag(); } }}
              placeholder={tags.length ? '+ tag' : 'add a tag…'}
              className="w-24 rounded-full border border-dashed border-[var(--line)] bg-transparent px-2.5 py-1 text-xs outline-none focus:border-[var(--gold)]"
            />
          </div>
        </div>

        {collections.length > 0 && (
          <div className="px-5 pb-2">
            <label className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Section</label>
            <select
              defaultValue={item.collectionId ?? ''}
              onChange={(e) => move(e.target.value)}
              className="mt-1 w-full rounded-full border border-[var(--line)] bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--gold)]"
            >
              <option value="">To sort</option>
              {collections.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        )}

        <div className="mt-2 border-t border-[var(--line)] p-5">
          <h3 className="text-[11px] uppercase tracking-wide text-[var(--ink-faint)]">Conversation</h3>
          {loading ? (
            <p className="mt-3 text-sm text-[var(--ink-faint)]">Loading…</p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {comments.length === 0 && <p className="text-sm text-[var(--ink-faint)]">No comments yet. Start the conversation.</p>}
              {comments.map((c) => (
                <div key={c.id} className="rounded-[12px] bg-[var(--cream)] px-3 py-2">
                  <p className="text-[11px] text-[var(--gold)]">{c.author}</p>
                  <p className="text-sm text-[var(--ink)]">{c.body}</p>
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComment(); }}
              rows={2}
              placeholder="Add a thought… (⌘/Ctrl+Enter)"
              className="flex-1 resize-none rounded-[12px] border border-[var(--line)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--gold)]"
            />
            <button onClick={submitComment} className="rounded-full bg-[var(--clay)] px-4 py-2 text-sm text-white">Send</button>
          </div>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
}
