import 'server-only';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import type { UserRole } from '@/server/db/schema';
import { SESSION_TTL_MS, validateSessionToken, type SessionUser } from './session';

/** `__Host-` prefix binds the cookie to this exact origin over HTTPS (no Domain, Path=/). */
export const SESSION_COOKIE =
  process.env.NODE_ENV === 'production' ? '__Host-newsroom_session' : 'newsroom_session';

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user for this request, or null. Memoised per request. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const result = await validateSessionToken(token);
  if (!result) return null;
  if (result.refreshed) {
    // Cookies can only be written from actions/route handlers; ignore during render.
    try {
      await setSessionCookie(token, new Date(Date.now() + SESSION_TTL_MS));
    } catch {
      /* rendering a server component: the DB expiry was still extended */
    }
  }
  return result.user;
});

/** For pages and actions under /admin. Redirects anonymous visitors to the login page. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/admin/login');
  return user;
}

export async function requireRole(...roles: UserRole[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect('/admin?denied=1');
  return user;
}

export async function getClientIp(): Promise<string> {
  const h = await headers();
  // Behind a trusted reverse proxy, x-forwarded-for's first hop is the client. See docs/SECURITY.md.
  const forwarded = h.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (forwarded || h.get('x-real-ip') || 'unknown').slice(0, 64);
}
