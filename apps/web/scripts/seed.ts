/**
 * Seeds a fresh database with demonstration sections, bylines, tags, placeholder images and
 * articles. Refuses to run if content already exists. Does NOT create login accounts: use
 * `pnpm user:create` for that, so no credentials ever live in the repository.
 */
import { deflateSync } from 'node:zlib';
import { loadRootEnv } from '../src/load-env';

loadRootEnv();

const { db, closeDb } = await import('../src/server/db');
const schema = await import('../src/server/db/schema');
const { docFromMarkup, docToPlainText, readingTimeMinutes } =
  await import('../src/lib/rich-text/text');
const { slugify } = await import('../src/lib/slug');
const { getStorage } = await import('../src/server/media/storage');
const { generateStorageKey } = await import('../src/server/media/upload');
const { count } = await import('drizzle-orm');
const content = await import('./seed-content');

// ---------------------------------------------------------------------------
// Placeholder imagery: halftone compositions rendered to PNG with no dependencies.
// ---------------------------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(width: number, height: number, rgb: Uint8Array): Buffer {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    rgb.subarray(y * width * 3, (y + 1) * width * 3).forEach((v, i) => {
      raw[y * (width * 3 + 1) + 1 + i] = v;
    });
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', new Uint8Array()),
  ]);
}

function prng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

type Field = (x: number, y: number) => number; // 0..1 tone at normalised coords

const fields: Field[] = [
  (x, y) => 1 - Math.min(1, Math.hypot(x - 0.62, y - 0.45) * 2.1), // single orb
  (x, y) => 0.5 + 0.5 * Math.sin((x + y) * 9), // diagonal bands
  (x, y) => (y > 0.58 ? 0.85 - (y - 0.58) : 0.15 + y * 0.4), // horizon
  (x, y) => Math.max(0, 1 - Math.abs(x - 0.5) * 3) * (0.4 + y * 0.6), // column of light
  (x, y) => 0.5 + 0.5 * Math.sin(Math.hypot(x - 0.3, y - 0.7) * 22), // ripples
  (x, y) => (Math.floor(x * 6) % 2 === 0 ? 0.75 : 0.2) * (1 - y * 0.5), // stage lights
  (x, y) => Math.min(1, Math.hypot(x - 0.5, y - 0.5) * 1.6), // vignette
  (x, y) => 1 - Math.min(1, Math.abs(y - 0.5 - 0.2 * Math.sin(x * 7)) * 4), // wave
  (x, y) => ((Math.floor(x * 10) + Math.floor(y * 6)) % 3 === 0 ? 0.9 : 0.15), // paste-up grid
];

const PAPER = [236, 231, 220];
const INK = [22, 21, 19];
const ACCENT = [196, 54, 31];

function placeholderImage(index: number): Buffer {
  const width = 1200;
  const height = 750;
  const cell = 9;
  const field = fields[index % fields.length]!;
  const ink = index % 4 === 1 ? ACCENT : INK;
  const rand = prng(index * 7919 + 17);
  const rgb = new Uint8Array(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const cx = Math.floor(x / cell) * cell + cell / 2;
      const cy = Math.floor(y / cell) * cell + cell / 2;
      const tone = Math.max(0, Math.min(1, field(cx / width, cy / height)));
      const r = Math.sqrt(tone) * cell * 0.62;
      const inked = Math.hypot(x - cx, y - cy) < r;
      const grain = (rand() - 0.5) * 18;
      const base = inked ? ink : PAPER;
      const o = (y * width + x) * 3;
      rgb[o] = Math.max(0, Math.min(255, base[0]! + grain));
      rgb[o + 1] = Math.max(0, Math.min(255, base[1]! + grain));
      rgb[o + 2] = Math.max(0, Math.min(255, base[2]! + grain));
    }
  }
  return encodePng(width, height, rgb);
}

// ---------------------------------------------------------------------------

try {
  const [existing] = await db.select({ n: count() }).from(schema.categories);
  if ((existing?.n ?? 0) > 0) {
    console.error(
      'The database already contains content. The seed only runs against an empty database.',
    );
    process.exitCode = 1;
  } else {
    await seed();
  }
} catch (error) {
  console.error('Seed failed:', error);
  process.exitCode = 1;
} finally {
  await closeDb();
}

async function seed() {
  const categories = await db
    .insert(schema.categories)
    .values(content.seedCategories.map((c, i) => ({ ...c, displayOrder: (i + 1) * 10 })))
    .returning();
  const authors = await db.insert(schema.authors).values(content.seedAuthors).returning();

  const imageCount = Math.max(...content.seedArticles.map((a) => a.image ?? -1)) + 1;
  const images: (typeof schema.media.$inferSelect)[] = [];
  for (let i = 0; i < imageCount; i++) {
    const png = placeholderImage(i);
    const key = generateStorageKey('png');
    await getStorage().put(key, png);
    const [row] = await db
      .insert(schema.media)
      .values({
        storageKey: key,
        originalFilename: `placeholder-${i + 1}.png`,
        mimeType: 'image/png',
        fileSize: png.byteLength,
        width: 1200,
        height: 750,
        altText: 'Abstract halftone placeholder illustration',
        credit: 'Generated placeholder',
      })
      .returning();
    if (row) images.push(row);
    process.stdout.write(`\rGenerated placeholder images: ${i + 1}/${imageCount}`);
  }
  process.stdout.write('\n');

  const tagNames = [...new Set(content.seedArticles.flatMap((a) => a.tags))];
  const tags = await db
    .insert(schema.tags)
    .values(tagNames.map((name) => ({ name, slug: slugify(name) })))
    .returning();

  const bySlug = <T extends { slug: string }>(rows: T[], slug: string): T => {
    const row = rows.find((r) => r.slug === slug);
    if (!row) throw new Error(`Seed reference not found: ${slug}`);
    return row;
  };

  for (const a of content.seedArticles) {
    const body = docFromMarkup(a.body);
    const bodyText = docToPlainText(body);
    const status = a.status ?? 'published';
    const publishedAt =
      status === 'published' ? new Date(Date.now() - a.daysAgo * 86_400_000 - 3_600_000) : null;
    const image = a.image !== undefined ? images[a.image] : undefined;
    const [article] = await db
      .insert(schema.articles)
      .values({
        title: a.title,
        slug: a.slug,
        dek: a.dek,
        excerpt: a.excerpt,
        body,
        bodyText,
        readingTime: readingTimeMinutes(bodyText),
        authorId: bySlug(authors, a.author).id,
        categoryId: bySlug(categories, a.category).id,
        status,
        featured: a.featured ?? false,
        publishedAt,
        featuredImageId: image?.id ?? null,
        imageCaption: image
          ? 'Placeholder illustration generated for the demonstration build.'
          : '',
        imageCredit: image ? 'Generated placeholder' : '',
      })
      .returning();
    if (!article) throw new Error('Insert failed');
    await db
      .insert(schema.articleTags)
      .values(
        a.tags.map((name) => ({ articleId: article.id, tagId: bySlug(tags, slugify(name)).id })),
      );
  }

  console.log(
    `Seeded ${categories.length} sections, ${authors.length} bylines, ${tags.length} tags, ${images.length} images, ${content.seedArticles.length} articles.`,
  );
  console.log(
    'Next: create an administrator with `pnpm user:create --email <email> --name "<name>" --role admin`.',
  );
}
