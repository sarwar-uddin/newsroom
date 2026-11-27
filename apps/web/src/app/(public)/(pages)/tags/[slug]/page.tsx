import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ArchiveHeader, ArchiveList, isPageOutOfRange } from '@/components/public/archive';
import { parsePage } from '@/components/public/pagination';
import { getTagBySlug, listTagArticles } from '@/server/content/public';

const load = cache((slug: string) => getTagBySlug(slug));

export async function generateMetadata({ params }: PageProps<'/tags/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const tag = await load(slug);
  if (!tag) return { title: 'Not found' };
  return { title: tag.name, alternates: { canonical: `/tags/${tag.slug}` } };
}

export default async function TagPage({ params, searchParams }: PageProps<'/tags/[slug]'>) {
  const { slug } = await params;
  const page = parsePage((await searchParams).page);
  const tag = await load(slug);
  if (!tag) notFound();
  const result = await listTagArticles(tag.id, page);
  if (isPageOutOfRange(page, result.pageCount)) notFound();
  return (
    <>
      <ArchiveHeader label="Topic" title={tag.name} />
      <ArchiveList
        result={result}
        href={(p) => `/tags/${tag.slug}${p > 1 ? `?page=${p}` : ''}`}
        empty="No published articles on this topic yet."
      />
    </>
  );
}
