import { createHash, randomBytes } from 'node:crypto';
import { and, eq, gt, isNull, lt } from 'drizzle-orm';
import { db } from '@/server/db';
import { sessions, users, type UserRole } from '@/server/db/schema';

/**
 * Database-backed sessions (the pattern recommended by the former Lucia project and OWASP):
 * the cookie carries 32 random bytes; the database stores only their SHA-256, so a leaked
 * sessions table cannot be replayed. Sessions slide: they last 14 days and are extended when
 * used during their second half.
 */
export const SESSION_TTL_MS = 14 * 24 * 60 * 60 * 1000;
const SESSION_REFRESH_MS = SESSION_TTL_MS / 2;

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  authorId: string | null;
};

export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ id: hashSessionToken(token), userId, expiresAt });
  // Opportunistic cleanup keeps the table small without a scheduler.
  await db
    .delete(sessions)
    .where(and(eq(sessions.userId, userId), lt(sessions.expiresAt, new Date())));
  return { token, expiresAt };
}

export async function validateSessionToken(
  token: string,
): Promise<{ user: SessionUser; expiresAt: Date; refreshed: boolean } | null> {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const id = hashSessionToken(token);
  const [row] = await db
    .select({
      expiresAt: sessions.expiresAt,
      user: {
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        authorId: users.authorId,
      },
    })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.id, id), gt(sessions.expiresAt, new Date()), isNull(users.disabledAt)))
    .limit(1);
  if (!row) return null;

  if (row.expiresAt.getTime() - Date.now() < SESSION_REFRESH_MS) {
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
    await db.update(sessions).set({ expiresAt }).where(eq(sessions.id, id));
    return { user: row.user, expiresAt, refreshed: true };
  }
  return { user: row.user, expiresAt: row.expiresAt, refreshed: false };
}

export async function invalidateSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, hashSessionToken(token)));
}

export async function invalidateUserSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}
