import { randomBytes } from 'node:crypto';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/server/db';
import { media } from '@/server/db/schema';
import { DomainError } from '@/server/content/errors';
import { canManageTaxonomy, type Actor } from '@/server/content/workflow';
import { env } from '@/server/env';
import { imageDimensions, sniffImage } from './sniff';
import { getStorage } from './storage';

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

export function generateStorageKey(ext: string, now = new Date()): string {
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  return `${yyyy}/${mm}/${randomBytes(16).toString('hex')}.${ext}`;
}

/** Keeps a readable, harmless version of the original filename for the library only. */
export function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? 'upload';
  return base.replace(/[^\w.\- ]+/g, '_').slice(0, 200) || 'upload';
}

const metaSchema = z.object({
  altText: z.string().trim().max(500).default(''),
  credit: z.string().trim().max(200).default(''),
});

export async function uploadImage(
  actor: Actor,
  file: { name: string; size: number; bytes: Uint8Array },
  meta: { altText?: unknown; credit?: unknown },
) {
  const max = env().MEDIA_MAX_BYTES;
  if (file.size <= 0 || file.bytes.byteLength === 0)
    throw new DomainError('invalid', 'The file is empty.');
  if (file.size > max || file.bytes.byteLength > max) {
    throw new DomainError(
      'invalid',
      `Images must be ${Math.floor(max / 1024 / 1024)} MB or smaller.`,
    );
  }
  const type = sniffImage(file.bytes);
  if (!type)
    throw new DomainError('invalid', 'Only JPEG, PNG, WebP and GIF images can be uploaded.');
  const parsedMeta = metaSchema.safeParse(meta);
  if (!parsedMeta.success) throw new DomainError('invalid', 'Alt text or credit is too long.');

  const key = generateStorageKey(type.ext);
  const dims = imageDimensions(file.bytes, type);
  await getStorage().put(key, file.bytes);
  try {
    const [row] = await db
      .insert(media)
      .values({
        storageKey: key,
        originalFilename: sanitizeFilename(file.name),
        mimeType: type.mime,
        fileSize: file.bytes.byteLength,
        width: dims?.width ?? null,
        height: dims?.height ?? null,
        altText: parsedMeta.data.altText,
        credit: parsedMeta.data.credit || null,
        uploadedBy: actor.id,
      })
      .returning();
    if (!row) throw new Error('Insert returned no row');
    return row;
  } catch (error) {
    await getStorage().delete(key);
    throw error;
  }
}

export async function listMedia(limit = 60) {
  return db.select().from(media).orderBy(desc(media.createdAt)).limit(limit);
}

export async function updateMediaMeta(
  actor: Actor,
  id: string,
  meta: { altText?: unknown; credit?: unknown },
) {
  const [item] = await db.select().from(media).where(eq(media.id, id));
  if (!item) throw new DomainError('not_found', 'Image not found.');
  if (!canManageTaxonomy(actor) && item.uploadedBy !== actor.id) {
    throw new DomainError('forbidden', 'You can only edit images you uploaded.');
  }
  const parsed = metaSchema.safeParse(meta);
  if (!parsed.success) throw new DomainError('invalid', 'Alt text or credit is too long.');
  await db
    .update(media)
    .set({ altText: parsed.data.altText, credit: parsed.data.credit || null })
    .where(eq(media.id, id));
}
