import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { site } from '@/config/site';
import { ArticleView } from '@/components/public/article-view';
import { SecondaryStory } from '@/components/public/story';
import { mediaUrl } from '@/lib/media';
import { truncateText } from '@/lib/rich-text/text';
import { getPublishedArticle, getRelated } from '@/server/content/public';
import { absoluteUrl, jsonLd } from '@/lib/seo';

const load = cache((slug: string) => getPublishedArticle(slug));

export async function generateMetadata({
  params,
}: PageProps<'/articles/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const article = await load(slug);
  if (!article) return { title: 'Not found', robots: { index: false } };
  const title = article.seoTitle || article.title;
  const description =
    article.seoDescription || article.dek || article.excerpt || truncateText(article.bodyText, 160);
  const path = `/articles/${article.slug}`;
  const image = article.featuredImage
    ? {
        url: mediaUrl(article.featuredImage.storageKey),
        alt: article.featuredImage.altText,
        width: article.featuredImage.width ?? undefined,
        height: article.featuredImage.height ?? undefined,
      }
    : undefined;
  return {
    title,
    description,
    alternates: { canonical: path },
    authors: [{ name: article.author.name, url: `/authors/${article.author.slug}` }],
    openGraph: {
      type: 'article',
      title,
      description,
      url: path,
      publishedTime: article.publishedAt.toISOString(),
      modifiedTime: (article.revisedAt ?? article.publishedAt).toISOString(),
      section: article.category.name,
      authors: [article.author.name],
      tags: article.tags.map((t) => t.name),
      images: image ? [image] : undefined,
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
      images: image ? [image.url] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: PageProps<'/articles/[slug]'>) {
  const { slug } = await params;
  const article = await load(slug);
  if (!article) notFound();

  const related = await getRelated(article);
  const url = absoluteUrl(`/articles/${article.slug}`);

  const structured = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: article.title,
    description: article.dek || article.excerpt || undefined,
    datePublished: article.publishedAt.toISOString(),
    dateModified: (article.revisedAt ?? article.publishedAt).toISOString(),
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    url,
    image: article.featuredImage
      ? [absoluteUrl(mediaUrl(article.featuredImage.storageKey))]
      : undefined,
    author: [
      {
        '@type': 'Person',
        name: article.author.name,
        url: absoluteUrl(`/authors/${article.author.slug}`),
      },
    ],
    publisher: { '@type': 'NewsMediaOrganization', name: site.name, url: absoluteUrl('/') },
    articleSection: article.category.name,
    keywords: article.tags.map((t) => t.name).join(', ') || undefined,
    wordCount: article.bodyText.split(/\s+/).filter(Boolean).length,
    inLanguage: article.locale,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />
      <ArticleView article={article} shareUrl={url} />
      {related.length > 0 && (
        <aside
          aria-labelledby="related-heading"
          className="mx-auto max-w-[90rem] px-4 sm:px-6 lg:px-10"
        >
          <h2 id="related-heading" className="font-masthead text-4xl border-b-2 border-ink pb-2">
            Read next
          </h2>
          <div className="mt-6 grid gap-8 divide-y divide-rule sm:grid-cols-3 sm:divide-y-0">
            {related.map((a) => (
              <div key={a.id} className="pt-6 first:pt-0 sm:pt-0">
                <SecondaryStory article={a} />
              </div>
            ))}
          </div>
        </aside>
      )}
    </>
  );
}
