import { eq } from 'drizzle-orm';
import { db } from '@/server/db';
import { media } from '@/server/db/schema';
import { getStorage, isValidStorageKey } from '@/server/media/storage';

/**
 * Serves uploaded media. The key must match the server-generated format and exist in the media
 * table; Content-Type comes from the database (set from sniffed bytes), never the URL.
 */
export async function GET(_req: Request, ctx: RouteContext<'/media/[...key]'>) {
  const { key: parts } = await ctx.params;
  const key = parts.join('/');
  if (!isValidStorageKey(key)) return new Response('Not found', { status: 404 });

  const [item] = await db
    .select({ mimeType: media.mimeType })
    .from(media)
    .where(eq(media.storageKey, key))
    .limit(1);
  if (!item) return new Response('Not found', { status: 404 });

  const bytes = await getStorage().get(key);
  if (!bytes) return new Response('Not found', { status: 404 });

  return new Response(new Uint8Array(bytes), {
    headers: {
      'Content-Type': item.mimeType,
      'Content-Length': String(bytes.byteLength),
      // Keys are random and never reused, so the content at a URL never changes.
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      'Cross-Origin-Resource-Policy': 'same-site',
    },
  });
}
