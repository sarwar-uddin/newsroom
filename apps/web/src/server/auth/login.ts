import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/server/db';
import { users } from '@/server/db/schema';
import { getDummyHash, MAX_PASSWORD_LENGTH, verifyPassword } from './password';
import { isLoginThrottled, recordLoginAttempt } from './rate-limit';
import { createSession } from './session';

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1).max(MAX_PASSWORD_LENGTH),
});

export type LoginResult =
  { ok: true; token: string; expiresAt: Date } | { ok: false; reason: 'invalid' | 'throttled' };

/** Verifies credentials and creates a session. Error responses never reveal which part was wrong. */
export async function attemptLogin(input: unknown, ip: string): Promise<LoginResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: 'invalid' };
  const { email, password } = parsed.data;

  if (await isLoginThrottled(email, ip)) return { ok: false, reason: 'throttled' };

  const [user] = await db
    .select({ id: users.id, passwordHash: users.passwordHash, disabledAt: users.disabledAt })
    .from(users)
    .where(eq(sql`lower(${users.email})`, email))
    .limit(1);

  // Always run one Argon2 verification so response time does not reveal whether the account exists.
  const valid = await verifyPassword(user?.passwordHash ?? (await getDummyHash()), password);
  if (!user || !valid || user.disabledAt) {
    await recordLoginAttempt(email, ip, false);
    return { ok: false, reason: 'invalid' };
  }

  await recordLoginAttempt(email, ip, true);
  const session = await createSession(user.id);
  return { ok: true, ...session };
}
