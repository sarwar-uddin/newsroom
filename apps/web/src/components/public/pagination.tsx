import Link from 'next/link';

export function Pagination({
  page,
  pageCount,
  href,
}: {
  page: number;
  pageCount: number;
  href: (page: number) => string;
}) {
  if (pageCount <= 1) return null;
  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-between border-t border-ink pt-4 meta"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} rel="prev" className="text-ink no-underline hover:underline">
          ← Newer
        </Link>
      ) : (
        <span />
      )}
      <span>
        Page {page} of {pageCount}
      </span>
      {page < pageCount ? (
        <Link href={href(page + 1)} rel="next" className="text-ink no-underline hover:underline">
          Older →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

/** Parses `?page=` safely; invalid values fall back to 1. */
export function parsePage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number.parseInt(raw ?? '1', 10);
  return Number.isFinite(n) && n > 0 && n < 10_000 ? n : 1;
}
