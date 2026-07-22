'use server';

import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { supabaseServer } from '@/lib/supabase/server';
import { getSessionUser, ensureAppUser } from '@/lib/auth/session';
import {
  createWorkspaceWithOwner,
  firstActiveWorkspaceId,
  seedWelcomeBasics,
  type WelcomeBasics,
} from '@/lib/workspace/create';
import type { AuthState } from '@/lib/auth/types';

const WELCOME_COOKIE = 'tmp_welcome';

export type { AuthState };

async function appOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  const h = await headers();
  const host = h.get('x-forwarded-host') ?? h.get('host') ?? 'localhost:3000';
  const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

async function readWelcome(): Promise<WelcomeBasics> {
  const store = await cookies();
  const raw = store.get(WELCOME_COOKIE)?.value;
  if (!raw) return {};
  try {
    return JSON.parse(raw) as WelcomeBasics;
  } catch {
    return {};
  }
}

// Called by the "Tell us about you" screen. Stashes the pre-account answers in a
// short-lived cookie, then hands off to the "Create profile" screen.
export async function saveWelcome(formData: FormData) {
  const basics: WelcomeBasics = {
    workspaceName: String(formData.get('workspaceName') || '').trim() || undefined,
    creatorRole: String(formData.get('creatorRole') || 'couple'),
    partnerOneLabel: String(formData.get('partnerOneLabel') || '').trim() || undefined,
    partnerTwoLabel: String(formData.get('partnerTwoLabel') || '').trim() || undefined,
  };
  const store = await cookies();
  store.set(WELCOME_COOKIE, JSON.stringify(basics), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60, // one hour is plenty to finish onboarding
  });
  redirect('/join');
}

// Ensures the signed-in user has an app profile row and a workspace, seeding the
// pre-account "tell us about you" answers. Returns the workspace id.
async function bootstrapAfterAuth(): Promise<void> {
  const authUser = await getSessionUser();
  if (!authUser) return;
  const userId = await ensureAppUser(authUser);
  let workspaceId = await firstActiveWorkspaceId(userId);
  const basics = await readWelcome();
  if (!workspaceId) {
    workspaceId = await createWorkspaceWithOwner(userId, basics.workspaceName || 'Our Wedding');
    await seedWelcomeBasics(workspaceId, basics);
  }
  const store = await cookies();
  store.delete(WELCOME_COOKIE);
}

export async function signUpWithPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const name = String(formData.get('name') || '').trim();
  if (!email || !password) return { error: 'Email and password are required.' };
  if (password.length < 8) return { error: 'Please use at least 8 characters for your password.' };

  const supabase = await supabaseServer();
  const origin = await appOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: name ? { name } : undefined, emailRedirectTo: `${origin}/auth/callback?next=/onboarding` },
  });
  if (error) return { error: error.message };

  // Email confirmation disabled -> we already have a session; go straight to the Dream.
  if (data.session) {
    await bootstrapAfterAuth();
    redirect('/onboarding');
  }
  // Email confirmation enabled -> ask them to confirm; callback finishes the bootstrap.
  return { check: true };
}

export async function signInWithPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const redirectTo = String(formData.get('redirect') || '') || '/peace-center';
  if (!email || !password) return { error: 'Email and password are required.' };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  await bootstrapAfterAuth();
  redirect(redirectTo.startsWith('/') ? redirectTo : '/peace-center');
}

export async function signOut() {
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
  redirect('/');
}
