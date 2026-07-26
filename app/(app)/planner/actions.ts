'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { ACTIVE_WORKSPACE_COOKIE, requireWorkspaceMember } from '@/lib/workspace/current';

export async function switchPlannerWorkspace(formData: FormData) {
  const workspaceId = String(formData.get('workspace_id') || '');
  if (!workspaceId) throw new Error('Choose a wedding');
  await requireWorkspaceMember(workspaceId);
  (await cookies()).set(ACTIVE_WORKSPACE_COOKIE, workspaceId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  const requested = String(formData.get('next') || '/peace-center');
  const next = requested.startsWith('/') && !requested.startsWith('//') ? requested : '/peace-center';
  redirect(next);
}
