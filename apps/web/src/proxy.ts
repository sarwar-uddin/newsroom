import { NextResponse, type NextRequest } from 'next/server';

/**
 * Optimistic gate for /admin: visitors without a session cookie are sent to the login page
 * before any rendering happens. This is a convenience, not the security boundary: every admin
 * page, server action and route handler validates the session against the database itself.
 */
const COOKIE_NAMES = ['__Host-newsroom_session', 'newsroom_session'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/admin/login') return NextResponse.next();
  const hasCookie = COOKIE_NAMES.some((n) => request.cookies.has(n));
  if (!hasCookie) {
    if (pathname.startsWith('/admin/api/'))
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    return NextResponse.redirect(new URL('/admin/login', request.url));
  }
  const res = NextResponse.next();
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  res.headers.set('Cache-Control', 'private, no-store');
  return res;
}

export const config = { matcher: ['/admin', '/admin/:path*'] };
