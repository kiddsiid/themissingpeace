import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Public routes; everything else (the workspace) requires an authenticated session.
const PUBLIC_PREFIXES = ['/sign-in', '/sign-up', '/welcome', '/join', '/auth', '/w'];
function isPublic(pathname: string): boolean {
  if (pathname === '/') return true;
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p));
}

// Refreshes the Supabase Auth session cookie on every request and guards private
// routes. Must run for all non-static paths (see middleware.ts matcher).
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: getUser() revalidates the token; do not run code between creating the
  // client and this call, or you risk hard-to-debug session bugs.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/join';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
