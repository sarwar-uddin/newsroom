import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { ArchiveHeader, ArchiveList, isPageOutOfRange } from '@/components/public/archive';
import { parsePage } from '@/components/public/pagination';
import { mediaUrl } from '@/lib/media';
import { getAuthorBySlug, listAuthorArticles } from '@/server/content/public';

const load = cache((slug: string) => getAuthorBySlug(slug));

const socialLabels = {
  website: 'Website',
  x: 'X',
  instagram: 'Instagram',
  facebook: 'Facebook',
  mastodon: 'Mastodon',
} as const;

export async function generateMetadata({
  params,
}: PageProps<'/authors/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const author = await load(slug);
  if (!author) return { title: 'Not found' };
  return {
    title: author.name,
    description: author.biography || `Articles by ${author.name}`,
    alternates: { canonical: `/authors/${author.slug}` },
    openGraph: { type: 'profile', title: author.name, url: `/authors/${author.slug}` },
  };
}

export default async function AuthorPage({ params, searchParams }: PageProps<'/authors/[slug]'>) {
  const { slug } = await params;
  const page = parsePage((await searchParams).page);
  const author = await load(slug);
  if (!author) notFound();
  const result = await listAuthorArticles(author.id, page);
  if (isPageOutOfRange(page, result.pageCount)) notFound();
  const links = (Object.keys(socialLabels) as (keyof typeof socialLabels)[]).filter(
    (k) => author.socialLinks[k],
  );

  return (
    <>
      <ArchiveHeader label="Contributor" title={author.name} description={author.biography}>
        {author.avatar && (
          <Image
            src={mediaUrl(author.avatar.storageKey)}
            alt={author.avatar.altText}
            width={96}
            height={96}
            className="mt-6 h-24 w-24 object-cover grayscale"
          />
        )}
        {links.length > 0 && (
          <ul className="mt-4 flex gap-4 meta">
            {links.map((k) => (
              <li key={k}>
                <a
                  href={author.socialLinks[k]}
                  rel="noopener noreferrer me"
                  className="!text-ink underline"
                >
                  {socialLabels[k]}
                </a>
              </li>
            ))}
          </ul>
        )}
      </ArchiveHeader>
      <ArchiveList
        result={result}
        href={(p) => `/authors/${author.slug}${p > 1 ? `?page=${p}` : ''}`}
        empty="No published work yet."
      />
    </>
  );
}
