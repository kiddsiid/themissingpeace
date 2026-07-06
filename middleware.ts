import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// Public routes; everything else (the workspace) requires auth.
const isPublic = createRouteMatcher(['/', '/sign-in(.*)', '/sign-up(.*)', '/api/webhooks(.*)', '/w(.*)']);

export default clerkMiddleware(async (auth, req) => {
  if (req.nextUrl.pathname.startsWith('/sign_in')) {
    return NextResponse.redirect(new URL(req.nextUrl.pathname.replace('/sign_in', '/sign-in'), req.url));
  }
  if (req.nextUrl.pathname.startsWith('/sign_up')) {
    return NextResponse.redirect(new URL(req.nextUrl.pathname.replace('/sign_up', '/sign-up'), req.url));
  }
  if (!isPublic(req)) {
    const { userId } = await auth();

    if (!userId) {
      const signInUrl = new URL('/sign-in', req.url);
      signInUrl.searchParams.set('redirect_url', req.url);
      return NextResponse.redirect(signInUrl);
    }
  }
});

export const config = {
  matcher: ['/((?!_next|.*\\..*).*)', '/(api|trpc)(.*)'],
};
