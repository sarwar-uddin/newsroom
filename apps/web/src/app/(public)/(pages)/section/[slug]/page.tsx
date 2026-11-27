import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ArchiveHeader, ArchiveList, isPageOutOfRange } from '@/components/public/archive';
import { parsePage } from '@/components/public/pagination';
import { getCategoryBySlug, listCategoryArticles } from '@/server/content/public';

const load = cache((slug: string) => getCategoryBySlug(slug));

export async function generateMetadata({
  params,
  searchParams,
}: PageProps<'/section/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const page = parsePage((await searchParams).page);
  const category = await load(slug);
  if (!category) return { title: 'Not found' };
  const path = `/section/${category.slug}${page > 1 ? `?page=${page}` : ''}`;
  return {
    title: page > 1 ? `${category.name} — page ${page}` : category.name,
    description: category.description || undefined,
    alternates: { canonical: path },
    openGraph: { title: category.name, description: category.description || undefined, url: path },
  };
}

export default async function SectionPage({ params, searchParams }: PageProps<'/section/[slug]'>) {
  const { slug } = await params;
  const page = parsePage((await searchParams).page);
  const category = await load(slug);
  if (!category) notFound();
  const result = await listCategoryArticles(category.id, page);
  if (isPageOutOfRange(page, result.pageCount)) notFound();

  return (
    <>
      <ArchiveHeader label="Section" title={category.name} description={category.description} />
      <ArchiveList
        result={result}
        href={(p) => `/section/${category.slug}${p > 1 ? `?page=${p}` : ''}`}
        empty="Nothing published in this section yet."
      />
    </>
  );
}
