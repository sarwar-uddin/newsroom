import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id with the library defaults (m=19 MiB, t=2, p=1), which match the OWASP Password Storage
 * Cheat Sheet's baseline recommendation. Parameters are encoded into each hash, so they can be
 * raised later without invalidating existing passwords.
 */
export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 256;

export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export async function verifyPassword(passwordHash: string, password: string): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** A precomputed hash used to equalise timing when the email is unknown. */
let dummyHash: Promise<string> | undefined;
export function getDummyHash(): Promise<string> {
  dummyHash ??= hash('timing-equaliser-not-a-real-password');
  return dummyHash;
}

export function passwordPolicyError(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH)
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > MAX_PASSWORD_LENGTH)
    return `Password must be at most ${MAX_PASSWORD_LENGTH} characters.`;
  return null;
}
