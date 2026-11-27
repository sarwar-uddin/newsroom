import { and, count, eq, gt, lt } from 'drizzle-orm';
import { db } from '@/server/db';
import { loginAttempts } from '@/server/db/schema';

/**
 * Login throttling backed by PostgreSQL, so limits hold across processes and restarts.
 * Failed attempts are counted per email and per client IP within a sliding window.
 */
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const MAX_FAILURES_PER_EMAIL = 5;
export const MAX_FAILURES_PER_IP = 25;

export async function isLoginThrottled(email: string, ip: string): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_WINDOW_MS);
  const [byEmail] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.email, email),
        eq(loginAttempts.success, false),
        gt(loginAttempts.createdAt, since),
      ),
    );
  if ((byEmail?.n ?? 0) >= MAX_FAILURES_PER_EMAIL) return true;
  const [byIp] = await db
    .select({ n: count() })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.ip, ip),
        eq(loginAttempts.success, false),
        gt(loginAttempts.createdAt, since),
      ),
    );
  return (byIp?.n ?? 0) >= MAX_FAILURES_PER_IP;
}

export async function recordLoginAttempt(
  email: string,
  ip: string,
  success: boolean,
): Promise<void> {
  await db.insert(loginAttempts).values({ email, ip, success });
  if (success) {
    // A successful login clears the failure history for that account.
    await db
      .delete(loginAttempts)
      .where(and(eq(loginAttempts.email, email), eq(loginAttempts.success, false)));
  }
  // Keep the table bounded.
  await db
    .delete(loginAttempts)
    .where(lt(loginAttempts.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));
}
