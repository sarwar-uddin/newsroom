import type { MetadataRoute } from 'next';
import { absoluteUrl } from '@/lib/seo';
import { getSitemapEntries } from '@/server/content/public';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { articles, categories, authors } = await getSitemapEntries();
  return [
    { url: absoluteUrl('/'), changeFrequency: 'hourly', priority: 1 },
    ...categories.map((c) => ({
      url: absoluteUrl(`/section/${c.slug}`),
      changeFrequency: 'daily' as const,
      priority: 0.7,
    })),
    ...articles.map((a) => ({
      url: absoluteUrl(`/articles/${a.slug}`),
      lastModified: a.updatedAt,
      priority: 0.8,
    })),
    ...authors.map((a) => ({ url: absoluteUrl(`/authors/${a.slug}`), priority: 0.4 })),
    ...['/about', '/contact', '/privacy'].map((p) => ({ url: absoluteUrl(p), priority: 0.2 })),
  ];
}
