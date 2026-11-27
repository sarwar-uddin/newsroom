import type { ArticleCard, Page } from '@/server/content/public';
import { Pagination } from './pagination';
import { ArchiveStory } from './story';

export function ArchiveList({
  result,
  href,
  empty,
}: {
  result: Page<ArticleCard>;
  href: (page: number) => string;
  empty: string;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6">
      {result.items.length === 0 ? (
        <p className="py-16 text-lg text-muted italic">{empty}</p>
      ) : (
        <div className="divide-y divide-rule">
          {result.items.map((a) => (
            <ArchiveStory key={a.id} article={a} />
          ))}
        </div>
      )}
      <Pagination page={result.page} pageCount={result.pageCount} href={href} />
    </div>
  );
}

export function ArchiveHeader({
  label,
  title,
  description,
  children,
}: {
  label: string;
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <header className="mx-auto max-w-5xl px-4 sm:px-6 pt-10 pb-6 border-b-2 border-ink mb-2">
      <p className="kicker">{label}</p>
      <h1 className="font-masthead mt-2 text-6xl sm:text-8xl">{title}</h1>
      {description && (
        <p className="mt-4 max-w-2xl text-lg sm:text-xl text-ink-soft leading-snug">
          {description}
        </p>
      )}
      {children}
    </header>
  );
}

/** Pages past the end of an archive are 404s, not empty pages. */
export function isPageOutOfRange(page: number, pageCount: number): boolean {
  return page > 1 && page > pageCount;
}
