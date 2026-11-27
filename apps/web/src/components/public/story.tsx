import Image from 'next/image';
import Link from 'next/link';
import { formatDate } from '@/lib/dates';
import { mediaUrl } from '@/lib/media';
import type { ArticleCard } from '@/server/content/public';

export const articleHref = (slug: string) => `/articles/${slug}`;
export const sectionHref = (slug: string) => `/section/${slug}`;
export const authorHref = (slug: string) => `/authors/${slug}`;

export function Kicker({
  category,
  className = '',
}: {
  category: { name: string; slug: string };
  className?: string;
}) {
  return (
    <Link
      href={sectionHref(category.slug)}
      className={`kicker no-underline hover:underline ${className}`}
    >
      {category.name}
    </Link>
  );
}

export function StoryMeta({
  article,
  showAuthor = true,
  className = '',
}: {
  article: Pick<ArticleCard, 'author' | 'publishedAt' | 'readingTime'>;
  showAuthor?: boolean;
  className?: string;
}) {
  return (
    <p className={`meta ${className}`}>
      {showAuthor && (
        <>
          <Link
            href={authorHref(article.author.slug)}
            className="text-ink no-underline hover:underline"
          >
            {article.author.name}
          </Link>
          <span aria-hidden="true"> · </span>
        </>
      )}
      <time dateTime={article.publishedAt.toISOString()}>{formatDate(article.publishedAt)}</time>
      <span aria-hidden="true"> · </span>
      {article.readingTime} min read
    </p>
  );
}

export function StoryImage({
  image,
  sizes,
  priority = false,
  aspect = 'aspect-[16/10]',
  className = '',
}: {
  image: NonNullable<ArticleCard['image']>;
  sizes: string;
  priority?: boolean;
  aspect?: string;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden bg-paper-deep ${aspect} ${className}`}>
      <Image
        src={mediaUrl(image.storageKey)}
        alt={image.altText}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover"
      />
    </div>
  );
}

/** The single most important story: very large type, full-width image. */
export function LeadStory({ article }: { article: ArticleCard }) {
  return (
    <article className="flex flex-col gap-4">
      {article.image && (
        <Link
          href={articleHref(article.slug)}
          tabIndex={-1}
          aria-hidden="true"
          className="-mx-4 sm:mx-0"
        >
          <StoryImage image={article.image} sizes="(min-width: 1024px) 66vw, 100vw" priority />
        </Link>
      )}
      <Kicker category={article.category} />
      <h2 className="font-headline text-[2.4rem] sm:text-6xl lg:text-[4.4rem] text-balance">
        <Link href={articleHref(article.slug)} className="headline-link">
          {article.title}
        </Link>
      </h2>
      {article.dek && (
        <p className="max-w-3xl text-lg sm:text-xl leading-snug text-ink-soft text-pretty">
          {article.dek}
        </p>
      )}
      <StoryMeta article={article} />
    </article>
  );
}

/** Mid-weight story with image; collapses to a text-first row with a thumbnail on mobile. */
export function SecondaryStory({ article }: { article: ArticleCard }) {
  return (
    <article className="grid grid-cols-[1fr_6.5rem] gap-4 sm:flex sm:flex-col sm:gap-3">
      {article.image && (
        <Link
          href={articleHref(article.slug)}
          tabIndex={-1}
          aria-hidden="true"
          className="order-2 sm:order-none"
        >
          <StoryImage
            image={article.image}
            sizes="(min-width: 640px) 33vw, 104px"
            aspect="aspect-square sm:aspect-[3/2]"
          />
        </Link>
      )}
      <div className="flex flex-col gap-2">
        <Kicker category={article.category} />
        <h3 className="font-headline text-2xl sm:text-[1.7rem] text-balance">
          <Link href={articleHref(article.slug)} className="headline-link">
            {article.title}
          </Link>
        </h3>
        {article.dek && (
          <p className="hidden sm:block text-base leading-snug text-ink-soft line-clamp-3">
            {article.dek}
          </p>
        )}
        <StoryMeta article={article} />
      </div>
    </article>
  );
}

/** Compact text-only entry for lists. */
export function ListStory({
  article,
  index,
  showSection = true,
}: {
  article: ArticleCard;
  index?: number;
  showSection?: boolean;
}) {
  return (
    <article className="flex gap-4 py-4">
      {index !== undefined && (
        <span
          className="font-masthead text-4xl text-accent w-8 shrink-0 tabular-nums"
          aria-hidden="true"
        >
          {index + 1}
        </span>
      )}
      <div className="flex flex-col gap-1.5">
        {showSection && <Kicker category={article.category} />}
        <h3 className="font-headline text-xl text-balance">
          <Link href={articleHref(article.slug)} className="headline-link">
            {article.title}
          </Link>
        </h3>
        <StoryMeta article={article} />
      </div>
    </article>
  );
}

/** Row used in archives and search results. */
export function ArchiveStory({ article }: { article: ArticleCard }) {
  return (
    <article className="grid grid-cols-1 gap-4 py-7 sm:grid-cols-[1fr_14rem] sm:gap-8">
      <div className="flex flex-col gap-2">
        <Kicker category={article.category} />
        <h2 className="font-headline text-2xl sm:text-3xl text-balance">
          <Link href={articleHref(article.slug)} className="headline-link">
            {article.title}
          </Link>
        </h2>
        {(article.dek || article.excerpt) && (
          <p className="text-base sm:text-lg leading-snug text-ink-soft max-w-2xl">
            {article.dek || article.excerpt}
          </p>
        )}
        <StoryMeta article={article} />
      </div>
      {article.image && (
        <Link
          href={articleHref(article.slug)}
          tabIndex={-1}
          aria-hidden="true"
          className="row-start-1 sm:row-start-auto"
        >
          <StoryImage
            image={article.image}
            sizes="(min-width: 640px) 224px, 100vw"
            aspect="aspect-[16/9] sm:aspect-[4/3]"
          />
        </Link>
      )}
    </article>
  );
}

export function SectionHeading({
  title,
  href,
  tone = 'ink',
  as: Tag = 'h2',
}: {
  title: string;
  href?: string;
  tone?: 'ink' | 'paper';
  as?: 'h1' | 'h2';
}) {
  const border = tone === 'ink' ? 'border-ink' : 'border-paper';
  return (
    <div
      className={`flex flex-wrap items-end justify-between gap-x-4 gap-y-1 border-b-2 ${border} pb-2`}
    >
      <Tag className="font-masthead text-4xl sm:text-5xl">
        {href ? (
          <Link href={href} className="no-underline hover:underline">
            {title}
          </Link>
        ) : (
          title
        )}
      </Tag>
      {href && (
        <Link
          href={href}
          className="meta no-underline hover:underline shrink-0"
          style={tone === 'paper' ? { color: 'inherit' } : undefined}
        >
          All {title.toLowerCase()} →
        </Link>
      )}
    </div>
  );
}
