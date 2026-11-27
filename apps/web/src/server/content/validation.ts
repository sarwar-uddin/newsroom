import { z } from 'zod';
import { isValidSlug, MAX_SLUG_LENGTH, slugify } from '@/lib/slug';
import { parseRichText, type RichTextDoc } from '@/lib/rich-text/schema';

const optionalText = (max: number) => z.string().trim().max(max).default('');
const optionalUuid = z
  .string()
  .trim()
  .transform((v) => (v === '' ? null : v))
  .pipe(z.uuid().nullable());

export const articleInputSchema = z
  .object({
    title: z.string().trim().min(1, 'A headline is required.').max(300),
    slug: z.string().trim().toLowerCase().max(MAX_SLUG_LENGTH).default(''),
    dek: optionalText(500),
    excerpt: optionalText(1000),
    body: z
      .string()
      .max(2_000_000)
      .transform((json, ctx): RichTextDoc => {
        try {
          return parseRichText(json);
        } catch {
          ctx.addIssue({
            code: 'custom',
            message: 'The article body contains unsupported content.',
          });
          return z.NEVER;
        }
      }),
    authorId: z.uuid('Choose a byline.'),
    categoryId: z.uuid('Choose a section.'),
    tags: z
      .string()
      .default('')
      .transform((s) =>
        [
          ...new Set(
            s
              .split(',')
              .map((t) => t.trim().replace(/\s+/g, ' '))
              .filter(Boolean),
          ),
        ].slice(0, 20),
      )
      .pipe(z.array(z.string().max(60, 'Tags must be 60 characters or fewer.'))),
    featuredImageId: optionalUuid.default(null),
    imageCaption: optionalText(500),
    imageCredit: optionalText(200),
    seoTitle: optionalText(200),
    seoDescription: optionalText(320),
    featured: z
      .union([z.literal('on'), z.literal('true'), z.literal(''), z.literal('false')])
      .optional()
      .transform((v) => v === 'on' || v === 'true'),
  })
  .transform((v, ctx) => {
    const slug = v.slug || slugify(v.title);
    if (!isValidSlug(slug)) {
      ctx.addIssue({
        code: 'custom',
        path: ['slug'],
        message:
          'Use lowercase letters, numbers and single hyphens (a Latin-script title or manual slug is needed).',
      });
      return z.NEVER;
    }
    return { ...v, slug };
  });

export type ArticleInput = z.output<typeof articleInputSchema>;

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? 'form');
    out[key] ??= issue.message;
  }
  return out;
}

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(MAX_SLUG_LENGTH)
    .default('')
    .refine((s) => s === '' || isValidSlug(s), 'Invalid slug.'),
  description: optionalText(1000),
  displayOrder: z.coerce.number().int().min(0).max(10_000).default(0),
});

const urlOrEmpty = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === '' || /^https:\/\//.test(v), 'Links must start with https://')
  .default('');

export const authorInputSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(MAX_SLUG_LENGTH)
    .default('')
    .refine((s) => s === '' || isValidSlug(s), 'Invalid slug.'),
  biography: optionalText(3000),
  avatarMediaId: optionalUuid.default(null),
  website: urlOrEmpty,
  x: urlOrEmpty,
  instagram: urlOrEmpty,
});
