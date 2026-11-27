import type { ArticleStatus } from '@/server/db/schema';

const labels: Record<ArticleStatus, string> = {
  draft: 'Draft',
  review: 'In review',
  published: 'Published',
  archived: 'Archived',
};

export function StatusPill({ status }: { status: ArticleStatus }) {
  return <span className={`status-pill status-${status}`}>{labels[status]}</span>;
}
