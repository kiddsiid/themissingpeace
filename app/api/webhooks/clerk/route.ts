import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { supabaseAdmin } from '@/lib/supabase/admin';

// Sync Clerk → Supabase (users, workspaces, memberships). Optional for local dev
// (onboarding upserts inline), but recommended so invited members land correctly.
function mapRole(clerkRole?: string, appRole?: string): string {
  if (appRole) return appRole;
  if (clerkRole && clerkRole.includes('admin')) return 'partner';
  return 'collaborator';
}

export async function POST(req: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;
  if (!secret) return new Response('No webhook secret', { status: 500 });
  const h = await headers();
  const payload = await req.text();
  let evt: any;
  try {
    evt = new Webhook(secret).verify(payload, {
      'svix-id': h.get('svix-id')!, 'svix-timestamp': h.get('svix-timestamp')!, 'svix-signature': h.get('svix-signature')!,
    });
  } catch {
    return new Response('Invalid signature', { status: 400 });
  }

  const db = supabaseAdmin();
  switch (evt.type) {
    case 'user.created':
    case 'user.updated': {
      const u = evt.data;
      await db.from('users').upsert({
        clerk_user_id: u.id,
        email: u.email_addresses?.[0]?.email_address ?? '',
        name: [u.first_name, u.last_name].filter(Boolean).join(' ') || null,
        avatar_url: u.image_url ?? null,
      }, { onConflict: 'clerk_user_id' });
      break;
    }
    case 'organization.created':
    case 'organization.updated': {
      const o = evt.data;
      await db.from('workspaces').upsert({ clerk_org_id: o.id, name: o.name }, { onConflict: 'clerk_org_id' });
      break;
    }
    case 'organizationMembership.created':
    case 'organizationMembership.updated': {
      const m = evt.data;
      const { data: ws } = await db.from('workspaces').select('id').eq('clerk_org_id', m.organization?.id).maybeSingle();
      const { data: user } = await db.from('users').select('id').eq('clerk_user_id', m.public_user_data?.user_id).maybeSingle();
      if (ws && user) {
        await db.from('workspace_members').upsert({
          workspace_id: ws.id, user_id: user.id, status: 'active',
          role: mapRole(m.role, m.public_metadata?.appRole),
        }, { onConflict: 'workspace_id,user_id' });
      }
      break;
    }
  }
  return new Response('ok', { status: 200 });
}
