import { Liveblocks } from '@liveblocks/node';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getSessionUser, ensureAppUser } from '@/lib/auth/session';

const lb = new Liveblocks({ secret: process.env.LIVEBLOCKS_SECRET_KEY! });

// Issue a room token only if the caller is an active member of the object's workspace.
// Presence stays ephemeral in Liveblocks and never enters decision history.
export async function POST(req: Request) {
  const authUser = await getSessionUser();
  if (!authUser) return new Response('Unauthorized', { status: 401 });
  const userId = await ensureAppUser(authUser);

  const { room } = (await req.json().catch(() => ({}))) as { room?: string };
  if (!room) return new Response('Bad request', { status: 400 });

  const db = supabaseAdmin();
  const { data: user } = await db.from('users').select('id, name, display_name, avatar_url').eq('id', userId).maybeSingle();
  if (!user) return new Response('Forbidden', { status: 403 });
  let workspaceId: string | null = null;
  if (room.startsWith('board:')) {
    const objectId = room.slice('board:'.length);
    const { data } = await db.from('boards').select('workspace_id').eq('id', objectId).maybeSingle();
    workspaceId = data?.workspace_id ?? null;
  } else if (room.startsWith('decision:')) {
    const objectId = room.slice('decision:'.length);
    const { data } = await db.from('decisions').select('workspace_id').eq('id', objectId).maybeSingle();
    workspaceId = data?.workspace_id ?? null;
  } else if (room.startsWith('feast-scene:')) {
    const objectId = room.slice('feast-scene:'.length);
    const { data } = await db.from('meal_scenes').select('workspace_id').eq('id', objectId).maybeSingle();
    workspaceId = data?.workspace_id ?? null;
  } else if (room.startsWith('feast-dish:')) {
    const objectId = room.slice('feast-dish:'.length);
    const { data } = await db.from('dishes').select('workspace_id').eq('id', objectId).maybeSingle();
    workspaceId = data?.workspace_id ?? null;
  } else if (room.startsWith('feast:')) {
    const objectId = room.slice('feast:'.length);
    const { data } = await db.from('workspaces').select('id').eq('id', objectId).maybeSingle();
    workspaceId = data?.id ?? null;
  } else {
    return new Response('Bad request', { status: 400 });
  }
  if (!workspaceId) return new Response('Forbidden', { status: 403 });
  const { data: member } = await db.from('workspace_members').select('role').eq('workspace_id', workspaceId).eq('user_id', user.id).eq('status', 'active').maybeSingle();
  if (!member) return new Response('Forbidden', { status: 403 });

  const session = lb.prepareSession(user.id, {
    userInfo: { name: (user.display_name || user.name || 'Guest') as string, avatar: user.avatar_url ?? undefined },
  });
  session.allow(room, session.FULL_ACCESS);
  const { body, status } = await session.authorize();
  return new Response(body, { status });
}
