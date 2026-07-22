import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';
import { getSessionUser, ensureAppUser } from '@/lib/auth/session';
import { createWorkspaceWithOwner, firstActiveWorkspaceId } from '@/lib/workspace/create';

// Handles Supabase Auth redirects: email-confirmation links and (later) OAuth
// (Google / Apple). Exchanges the code for a session, makes sure the user has an
// app profile + workspace, then continues into the flow.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') || '/peace-center';

  if (code) {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const authUser = await getSessionUser();
      if (authUser) {
        const userId = await ensureAppUser(authUser);
        const existing = await firstActiveWorkspaceId(userId);
        if (!existing) await createWorkspaceWithOwner(userId, 'Our Wedding');
      }
      return NextResponse.redirect(new URL(next, url.origin));
    }
  }

  return NextResponse.redirect(new URL('/join?error=auth', url.origin));
}
