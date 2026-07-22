import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Supabase Auth session refresh + route protection (replaces Clerk middleware).
export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
