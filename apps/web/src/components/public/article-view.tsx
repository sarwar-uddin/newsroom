import Image from 'next/image';
import Link from 'next/link';
import { formatDate } from '@/lib/dates';
import { mediaUrl } from '@/lib/media';
import { RichText } from '@/lib/rich-text/render';
import type { RichTextDoc } from '@/lib/rich-text/schema';
import { authorHref, sectionHref } from './story';

export type ArticleViewData = {
  title: string;
  dek: string;
  body: RichTextDoc;
  publishedAt: Date | null;
  revisedAt: Date | null;
  readingTime: number;
  imageCaption: string;
  imageCredit: string;
  author: {
    name: string;
    slug: string;
    biography: string;
    avatar?: { storageKey: string; altText: string } | null;
  };
  category: { name: string; slug: string };
  featuredImage: {
    storageKey: string;
    altText: string;
    width: number | null;
    height: number | null;
  } | null;
  tags: { name: string; slug: string }[];
};

/** The reading experience. Shared by the public article page and the CMS preview. */
export function ArticleView({
  article,
  shareUrl,
}: {
  article: ArticleViewData;
  shareUrl?: string;
}) {
  const img = article.featuredImage;
  return (
    <article className="pb-10">
      <header className="mx-auto max-w-5xl px-4 sm:px-6 pt-8 sm:pt-12">
        <Link
          href={sectionHref(article.category.slug)}
          className="kicker no-underline hover:underline"
        >
          {article.category.name}
        </Link>
        <h1 className="font-headline mt-3 text-[2.5rem] sm:text-6xl lg:text-7xl text-balance">
          {article.title}
        </h1>
        {article.dek && (
          <p className="mt-5 max-w-3xl text-xl sm:text-2xl leading-snug text-ink-soft text-pretty">
            {article.dek}
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-y border-ink py-3">
          <div className="meta">
            <span>By </span>
            <Link
              href={authorHref(article.author.slug)}
              className="font-headline text-base !text-ink uppercase no-underline hover:underline"
              style={{ fontStretch: '80%' }}
            >
              {article.author.name}
            </Link>
            <span className="block sm:inline sm:before:content-['_·_']">
              {article.publishedAt ? (
                <time dateTime={article.publishedAt.toISOString()}>
                  {formatDate(article.publishedAt)}
                </time>
              ) : (
                'Unpublished'
              )}
              {article.revisedAt &&
                article.publishedAt &&
                article.revisedAt > article.publishedAt && (
                  <>
                    {' · Updated '}
                    <time dateTime={article.revisedAt.toISOString()}>
                      {formatDate(article.revisedAt)}
                    </time>
                  </>
                )}
              {` · ${article.readingTime} min read`}
            </span>
          </div>
          {shareUrl && <ShareLinks url={shareUrl} title={article.title} />}
        </div>
      </header>

      {img && (
        <figure className="mx-auto mt-8 max-w-6xl sm:px-6">
          <div className="relative aspect-[16/10] overflow-hidden bg-paper-deep">
            <Image
              src={mediaUrl(img.storageKey)}
              alt={img.altText}
              fill
              priority
              sizes="(min-width: 1152px) 1152px, 100vw"
              className="object-cover"
            />
          </div>
          {(article.imageCaption || article.imageCredit) && (
            <figcaption className="meta mt-2 px-4 sm:px-0 flex flex-wrap gap-x-3">
              {article.imageCaption && (
                <span className="!text-ink-soft">{article.imageCaption}</span>
              )}
              {article.imageCredit && <span>Image: {article.imageCredit}</span>}
            </figcaption>
          )}
        </figure>
      )}

      <div className="mx-auto mt-10 max-w-5xl px-4 sm:px-6">
        <div className="prose-article mx-auto">
          <RichText doc={article.body} />
        </div>

        <footer className="mx-auto mt-14 max-w-[40rem] flex flex-col gap-8">
          {article.tags.length > 0 && (
            <div>
              <h2 className="kicker !text-ink mb-3">Topics</h2>
              <ul className="flex flex-wrap gap-2">
                {article.tags.map((t) => (
                  <li key={t.slug}>
                    <Link
                      href={`/tags/${t.slug}`}
                      className="meta inline-block border border-ink px-2.5 py-1 !text-ink no-underline hover:bg-ink hover:!text-paper"
                    >
                      {t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="border-t-2 border-ink pt-5 flex gap-4">
            {article.author.avatar && (
              <Image
                src={mediaUrl(article.author.avatar.storageKey)}
                alt=""
                width={64}
                height={64}
                className="h-16 w-16 shrink-0 object-cover grayscale"
              />
            )}
            <div>
              <Link
                href={authorHref(article.author.slug)}
                className="font-headline text-xl no-underline hover:underline"
              >
                {article.author.name}
              </Link>
              {article.author.biography && (
                <p className="mt-1 text-base text-ink-soft leading-snug">
                  {article.author.biography}
                </p>
              )}
            </div>
          </div>
        </footer>
      </div>
    </article>
  );
}

function ShareLinks({ url, title }: { url: string; title: string }) {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    { label: 'X', href: `https://x.com/intent/post?url=${u}&text=${t}` },
    { label: 'Facebook', href: `https://www.facebook.com/sharer/sharer.php?u=${u}` },
    { label: 'WhatsApp', href: `https://wa.me/?text=${t}%20${u}` },
    { label: 'LinkedIn', href: `https://www.linkedin.com/sharing/share-offsite/?url=${u}` },
    { label: 'Email', href: `mailto:?subject=${t}&body=${u}` },
  ];
  return (
    <nav
      aria-label="Share this article"
      className="meta flex flex-wrap items-center gap-x-3 gap-y-1"
    >
      <span>Share:</span>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          rel="noopener noreferrer"
          target={l.label === 'Email' ? undefined : '_blank'}
          className="!text-ink no-underline hover:underline"
        >
          {l.label}
        </a>
      ))}
    </nav>
  );
}
