import { redirect } from 'next/navigation';
import Link from 'next/link';
import { BoardView } from '@/components/board/BoardView';
import { MasterVision, type VisionSection } from '@/components/board/MasterVision';
import { seedBoards } from './actions';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getActiveWorkspace } from '@/lib/workspace/current';
import { signUploads } from '@/lib/supabase/storage';
import type { BoardItemView } from '@/lib/board/store';

async function loadBoardItems(boardId: string): Promise<BoardItemView[]> {
  const db = supabaseAdmin();
  const { data: items, error } = await db
    .from('board_items')
    .select('id, type, title, body, color_hex, source_url, disposition, collection_id, link_preview_id, is_favorite, created_by, upload_id')
    .eq('board_id', boardId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  if (!items?.length) return [];

  const previewIds = items.map((i) => i.link_preview_id).filter(Boolean) as string[];
  const itemIds = items.map((i) => i.id);
  const [previews, positions] = await Promise.all([
    previewIds.length ? db.from('link_previews').select('id, image_url, favicon_url, raw_meta').in('id', previewIds) : Promise.resolve({ data: [] as any[] }),
    db.from('board_item_positions').select('board_item_id, x, y, w, h, z, rotation, pinned').in('board_item_id', itemIds),
  ]);
  const imageById = new Map((previews.data ?? []).map((p: any) => [p.id, p.image_url]));
  const metaById = new Map((previews.data ?? []).map((p: any) => [p.id, { favicon: p.favicon_url, embed: p.raw_meta?.embed_url, kind: p.raw_meta?.media_kind }]));
  const posById = new Map((positions.data ?? []).map((p: any) => [p.board_item_id, p]));

  const creatorIds = [...new Set(items.map((i: any) => i.created_by).filter(Boolean))] as string[];
  const usersRes = creatorIds.length ? await db.from('users').select('id, name, display_name, avatar_url').in('id', creatorIds) : { data: [] as any[] };
  const userById = new Map((usersRes.data ?? []).map((u: any) => [u.id, u]));
  const uploadIds = [...new Set(items.map((i: any) => i.upload_id).filter(Boolean))] as string[];
  const upById = await signUploads(uploadIds);

  return items.map((i: any) => {
    const pos = posById.get(i.id);
    const up = i.upload_id ? upById.get(i.upload_id) : undefined;
    const upImg = !!up?.mime && up.mime.startsWith('image/');
    const meta = i.link_preview_id ? metaById.get(i.link_preview_id) : undefined;
    const imageUrl = (i.link_preview_id ? imageById.get(i.link_preview_id) ?? undefined : undefined) ?? (upImg ? up?.url ?? undefined : undefined);
    return {
      id: i.id, type: i.type, title: i.title ?? undefined, body: i.body ?? undefined,
      colorHex: i.color_hex ?? undefined, sourceUrl: i.source_url ?? (up && !upImg ? up.url ?? undefined : undefined),
      imageUrl,
      embedUrl: meta?.embed ?? undefined,
      mediaKind: (meta?.kind as string | undefined) ?? (imageUrl ? 'image' : undefined),
      faviconUrl: meta?.favicon ?? undefined,
      disposition: i.disposition, collectionId: i.collection_id ?? undefined,
      isFavorite: !!i.is_favorite,
      addedByName: i.created_by ? (userById.get(i.created_by)?.display_name || userById.get(i.created_by)?.name || undefined) : undefined,
      addedByAvatar: i.created_by ? (userById.get(i.created_by)?.avatar_url || undefined) : undefined,
      position: { x: pos?.x ?? 24, y: pos?.y ?? 24, w: pos?.w ?? undefined, h: pos?.h ?? undefined, z: pos?.z ?? 0, rotation: pos?.rotation ?? 0, pinned: !!pos?.pinned },
    } as BoardItemView;
  });
}

// Master Vision assembly — every APPROVED item across all boards, grouped by its
// source board (Board Overhaul: "automatically assembled from approved items").
async function loadMasterVision(workspaceId: string, boards: { id: string; title: string; type: string }[]): Promise<VisionSection[]> {
  const db = supabaseAdmin();
  const sourceBoards = boards.filter((b) => b.type !== 'master_vision');
  if (!sourceBoards.length) return [];
  const { data: items, error } = await db
    .from('board_items')
    .select('id, board_id, title, color_hex, source_url, link_preview_id, upload_id, created_by, approved_at')
    .eq('workspace_id', workspaceId)
    .eq('disposition', 'approved')
    .in('board_id', sourceBoards.map((b) => b.id))
    .order('approved_at', { ascending: false });
  if (error) throw error;
  if (!items?.length) return [];

  const previewIds = items.map((i: any) => i.link_preview_id).filter(Boolean) as string[];
  const uploadIds = [...new Set(items.map((i: any) => i.upload_id).filter(Boolean))] as string[];
  const [previews, upById] = await Promise.all([
    previewIds.length ? db.from('link_previews').select('id, image_url').in('id', previewIds) : Promise.resolve({ data: [] as any[] }),
    signUploads(uploadIds),
  ]);
  const imageById = new Map((previews.data ?? []).map((p: any) => [p.id, p.image_url]));

  const byBoard = new Map<string, VisionSection>();
  for (const b of sourceBoards) byBoard.set(b.id, { boardId: b.id, title: b.title, type: b.type, items: [] });
  for (const i of items as any[]) {
    const section = byBoard.get(i.board_id);
    if (!section) continue;
    const up = i.upload_id ? upById.get(i.upload_id) : undefined;
    const upImg = up?.mime?.startsWith('image/') ? up.url ?? undefined : undefined;
    section.items.push({
      id: i.id,
      title: i.title ?? undefined,
      imageUrl: (i.link_preview_id ? imageById.get(i.link_preview_id) ?? undefined : undefined) ?? upImg,
      colorHex: i.color_hex ?? undefined,
      sourceUrl: i.source_url ?? undefined,
    });
  }
  return [...byBoard.values()].filter((s) => s.items.length > 0);
}

export default async function BoardPage({ searchParams }: { searchParams: Promise<{ board?: string }> }) {
  const ws = await getActiveWorkspace();
  if (!ws) redirect('/onboarding');
  const db = supabaseAdmin();
  const { data: boards } = await db
    .from('boards').select('id, title, type').eq('workspace_id', ws.id).order('sort', { ascending: true });
  const list = boards ?? [];
  if (!list.length) {
    return (
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">The visual planning surface</p>
        <h1 className="voice text-4xl">The Board</h1>
        <p className="mt-2 text-sm text-[var(--ink-soft)]">Your boards haven’t been created yet. Seed the default boards — Venue, Ceremony, Reception, Attire, Food, Florals, and more — each with Dream / Shortlist / Approved sections, ready to gather inspiration.</p>
        <form action={seedBoards} className="mt-5">
          <button className="rounded-full bg-[var(--clay)] px-6 py-2.5 text-sm text-white shadow-sm transition-transform hover:-translate-y-0.5">✦ Create my boards</button>
        </form>
      </div>
    );
  }
  const wanted = (await searchParams)?.board;
  const board = list.find((b: any) => b.id === wanted) ?? list[0];

  // The Master Vision board is never edited directly — it assembles itself from approvals.
  if ((board as any).type === 'master_vision') {
    const [sections, profileRes, dreamRes] = await Promise.all([
      loadMasterVision(ws.id, list as any[]),
      db.from('wedding_profiles').select('partner_one_label, partner_two_label, wedding_date').eq('workspace_id', ws.id).maybeSingle(),
      db.from('dreams').select('responses_json').eq('workspace_id', ws.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    const profile = profileRes.data;
    const coupleLine = profile ? `${profile.partner_one_label} & ${profile.partner_two_label}` : 'Our wedding';
    const dateLine = profile?.wedding_date
      ? new Date(profile.wedding_date + 'T00:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
      : undefined;
    const initialMood = (dreamRes.data?.responses_json as any)?.boardMood?.summary as string | undefined;
    return (
      <div className="mx-auto max-w-6xl">
        <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">Assembled from everything you approve</p>
        <h1 className="voice text-4xl">The Master Vision</h1>
        <p className="mt-1 text-sm text-[var(--ink-soft)]">Approve a fragment on any board and it takes its place here — nothing to maintain by hand.</p>
        <div className="mb-2 mt-4 flex flex-wrap gap-1.5">
          {list.map((b: any) => (
            <Link key={b.id} href={`/board?board=${b.id}`} scroll={false}
              className={'whitespace-nowrap rounded-full px-3 py-1 text-xs transition-all hover:-translate-y-0.5 ' + (b.id === board.id ? 'bg-[var(--clay)] text-white shadow-sm' : 'border border-[var(--line)] text-[var(--ink-soft)] hover:bg-[var(--gold-bg)]')}>
              {b.title}
            </Link>
          ))}
        </div>
        <MasterVision workspaceId={ws.id} sections={sections} coupleLine={coupleLine} dateLine={dateLine} initialMood={initialMood} />
      </div>
    );
  }

  const [items, collectionsRes] = await Promise.all([
    loadBoardItems(board.id),
    db.from('board_collections').select('id, name, sort').eq('board_id', board.id).order('sort', { ascending: true }),
  ]);
  const collections = collectionsRes.data ?? [];
  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-faint)]">The visual planning surface</p>
      <h1 className="voice text-4xl">{board.title}</h1>
      <p className="mt-1 text-sm text-[var(--ink-soft)]">Gather what you love. Sort it into sections, then poof a fragment into the plan.</p>
      <div className="mt-4">
        <BoardView
          workspaceId={ws.id}
          boardId={board.id}
          boards={list}
          activeBoardId={board.id}
          collections={collections}
          initialItems={items}
          realtime={Boolean(process.env.LIVEBLOCKS_SECRET_KEY)}
        />
      </div>
    </div>
  );
}
