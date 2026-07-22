import { Liveblocks } from '@liveblocks/node';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSessionUser, ensureAppUser } from '@/lib/auth/session';

const lb = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });

// Issue a room token for board:{boardId} only if the caller is an active member of the
// board's workspace (Build Plan v2 §3 / §4.4).
export async function POST(req: Request) {
  const authUser = await getSessionUser();
  if (!authUser) return new Response('Unauthorized', { status: 401 });
  const userId = await ensureAppUser(authUser);

  const { room } = (await req.json().catch(() => ({}))) as { room?: string };
  if (!room || !room.startsWith('board:')) return new Response('Bad request', { status: 400 });
  const boardId = room.slice('board:'.length);

  const db = supabaseAdmin();
  const { data: user } = await db.from('users').select('id, name, display_name, avatar_url').eq('id', userId).maybeSingle();
  if (!user) return new Response('Forbidden', { status: 403 });
  const { data: board } = await db.from('boards').select('workspace_id').eq('id', boardId).maybeSingle();
  if (!board) return new Response('Forbidden', { status: 403 });
  const { data: member } = await db.from('workspace_members').select('role').eq('workspace_id', board.workspace_id).eq('user_id', user.id).eq('status', 'active').maybeSingle();
  if (!member) return new Response('Forbidden', { status: 403 });

  const session = lb.prepareSession(user.id, {
    userInfo: { name: (user.display_name || user.name || 'Guest') as string, avatar: user.avatar_url ?? undefined },
  });
  session.allow(room, session.FULL_ACCESS);
  const { body, status } = await session.authorize();
  return new Response(body, { status });
}
