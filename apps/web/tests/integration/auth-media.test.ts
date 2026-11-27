import { eq } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { attemptLogin } from '@/server/auth/login';
import { hashPassword } from '@/server/auth/password';
import { MAX_FAILURES_PER_EMAIL } from '@/server/auth/rate-limit';
import {
  createSession,
  hashSessionToken,
  invalidateSession,
  validateSessionToken,
} from '@/server/auth/session';
import { DomainError } from '@/server/content/errors';
import { closeDb, db } from '@/server/db';
import { media, sessions, users } from '@/server/db/schema';
import { getStorage } from '@/server/media/storage';
import { uploadImage, updateMediaMeta } from '@/server/media/upload';
import { hasTestDb, makeFixtures, resetDb } from '../helpers';

describe.skipIf(!hasTestDb)('authentication', () => {
  const password = 'correct horse battery staple';
  beforeEach(async () => {
    await resetDb();
    await db.insert(users).values({
      name: 'Ed',
      email: 'ed@test.local',
      role: 'editor',
      passwordHash: await hashPassword(password),
    });
  });
  afterAll(async () => {
    await closeDb();
  });

  it('logs in with the right password, case-insensitive email', async () => {
    const r = await attemptLogin({ email: 'ED@test.local', password }, '1.1.1.1');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const s = await validateSessionToken(r.token);
    expect(s?.user.email).toBe('ed@test.local');
    // Only the hash is stored.
    const [row] = await db.select().from(sessions);
    expect(row!.id).toBe(hashSessionToken(r.token));
    expect(row!.id).not.toBe(r.token);
  });

  it('rejects wrong passwords and unknown users identically', async () => {
    expect(
      await attemptLogin({ email: 'ed@test.local', password: 'wrong password!' }, '1.1.1.2'),
    ).toEqual({ ok: false, reason: 'invalid' });
    expect(await attemptLogin({ email: 'nobody@test.local', password }, '1.1.1.2')).toEqual({
      ok: false,
      reason: 'invalid',
    });
  });

  it('throttles repeated failures, even when the password is then correct', async () => {
    for (let i = 0; i < MAX_FAILURES_PER_EMAIL; i++)
      await attemptLogin({ email: 'ed@test.local', password: 'nope nope nope' }, '2.2.2.2');
    expect(await attemptLogin({ email: 'ed@test.local', password }, '2.2.2.2')).toEqual({
      ok: false,
      reason: 'throttled',
    });
  });

  it('refuses disabled accounts and invalidated sessions', async () => {
    const r = await attemptLogin({ email: 'ed@test.local', password }, '3.3.3.3');
    if (!r.ok) throw new Error('login failed');
    await invalidateSession(r.token);
    expect(await validateSessionToken(r.token)).toBeNull();
    const [u] = await db.select().from(users);
    const s2 = await createSession(u!.id);
    await db.update(users).set({ disabledAt: new Date() }).where(eq(users.id, u!.id));
    expect(await validateSessionToken(s2.token)).toBeNull();
    expect((await attemptLogin({ email: 'ed@test.local', password }, '3.3.3.3')).ok).toBe(false);
  });

  it('rejects malformed and expired tokens', async () => {
    expect(await validateSessionToken('x')).toBeNull();
    expect(await validateSessionToken('a'.repeat(43))).toBeNull();
    const [u] = await db.select().from(users);
    const s = await createSession(u!.id);
    await db.update(sessions).set({ expiresAt: new Date(Date.now() - 1000) });
    expect(await validateSessionToken(s.token)).toBeNull();
  });
});

describe.skipIf(!hasTestDb)('media uploads', () => {
  let fx: Awaited<ReturnType<typeof makeFixtures>>;
  beforeEach(async () => {
    await resetDb();
    fx = await makeFixtures();
  });

  // 1×1 PNG
  const png = Uint8Array.from(
    Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    ),
  );

  it('stores a valid image under a generated key, ignoring the client filename', async () => {
    const item = await uploadImage(
      fx.author1,
      { name: '../../../etc/passwd.png', size: png.byteLength, bytes: png },
      { altText: 'A dot' },
    );
    expect(item.storageKey).toMatch(/^\d{4}\/\d{2}\/[a-f0-9]{32}\.png$/);
    expect(item.mimeType).toBe('image/png');
    expect(item.width).toBe(1);
    expect(item.originalFilename).toBe('passwd.png');
    expect(new Uint8Array((await getStorage().get(item.storageKey))!)).toEqual(png);
  });

  it('rejects non-images, disguised scripts, empty and oversized files', async () => {
    const cases = [
      { name: 'shell.php', bytes: new TextEncoder().encode('<?php echo 1; ?>') },
      { name: 'image.png', bytes: new TextEncoder().encode('<svg onload="alert(1)"></svg>') },
      { name: 'empty.png', bytes: new Uint8Array() },
      { name: 'huge.png', bytes: new Uint8Array(2 * 1024 * 1024).fill(0x89) },
    ];
    for (const c of cases) {
      await expect(
        uploadImage(fx.editor, { name: c.name, size: c.bytes.byteLength, bytes: c.bytes }, {}),
      ).rejects.toBeInstanceOf(DomainError);
    }
    expect(await db.select().from(media)).toHaveLength(0);
  });

  it('lets only the uploader or editors change metadata', async () => {
    const item = await uploadImage(
      fx.author1,
      { name: 'a.png', size: png.byteLength, bytes: png },
      {},
    );
    await expect(
      updateMediaMeta(fx.author2, item.id, { altText: 'vandalised' }),
    ).rejects.toBeInstanceOf(DomainError);
    await updateMediaMeta(fx.editor, item.id, { altText: 'Fixed by editor' });
    const [row] = await db.select().from(media);
    expect(row!.altText).toBe('Fixed by editor');
  });
});
