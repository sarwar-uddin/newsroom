import type { ArticleStatus, UserRole } from '@/server/db/schema';

/**
 * Editorial permissions and status transitions as pure functions, so they can be tested in
 * isolation and shared by every server entry point. UI code may call these to decide what to
 * show, but every mutation re-checks them on the server.
 *
 *   admin  – everything
 *   editor – all content, publishing, taxonomy, bylines
 *   author – creates articles; edits only their own drafts; submits/withdraws for review
 */
export type Actor = { id: string; role: UserRole; authorId: string | null };
export type ArticleRef = { status: ArticleStatus; createdBy: string | null };

export type Intent =
  'save' | 'submit' | 'withdraw' | 'publish' | 'unpublish' | 'archive' | 'restore';

export const INTENT_TARGET: Record<Exclude<Intent, 'save'>, ArticleStatus> = {
  submit: 'review',
  withdraw: 'draft',
  publish: 'published',
  unpublish: 'draft',
  archive: 'archived',
  restore: 'draft',
};

const isEditorial = (actor: Actor) => actor.role === 'admin' || actor.role === 'editor';
const owns = (actor: Actor, article: ArticleRef) =>
  article.createdBy !== null && article.createdBy === actor.id;

export function canViewArticle(actor: Actor, article: ArticleRef): boolean {
  return isEditorial(actor) || owns(actor, article);
}

export function canEditArticle(actor: Actor, article: ArticleRef): boolean {
  if (isEditorial(actor)) return true;
  return owns(actor, article) && article.status === 'draft';
}

export function canDeleteArticle(actor: Actor, article: ArticleRef): boolean {
  if (article.status === 'published') return false; // unpublish first
  if (isEditorial(actor)) return true;
  return owns(actor, article) && article.status === 'draft';
}

/** Which roles may move an article between two statuses. `own` = authors on their own work. */
const TRANSITIONS: Record<ArticleStatus, Partial<Record<ArticleStatus, 'editorial' | 'own'>>> = {
  draft: { review: 'own', published: 'editorial', archived: 'editorial' },
  review: { draft: 'own', published: 'editorial', archived: 'editorial' },
  published: { draft: 'editorial', archived: 'editorial' },
  archived: { draft: 'editorial' },
};

export function isValidTransition(from: ArticleStatus, to: ArticleStatus): boolean {
  return TRANSITIONS[from][to] !== undefined;
}

export function canTransition(actor: Actor, article: ArticleRef, to: ArticleStatus): boolean {
  const rule = TRANSITIONS[article.status][to];
  if (!rule) return false;
  if (isEditorial(actor)) return true;
  return rule === 'own' && owns(actor, article);
}

/** Intents offered for an article in its current state, in display order. */
export function availableIntents(actor: Actor, article: ArticleRef): Intent[] {
  const out: Intent[] = [];
  if (canEditArticle(actor, article)) out.push('save');
  const candidates: Exclude<Intent, 'save'>[] = [
    'submit',
    'withdraw',
    'publish',
    'unpublish',
    'archive',
    'restore',
  ];
  for (const intent of candidates) {
    const target = INTENT_TARGET[intent];
    if (!canTransition(actor, article, target)) continue;
    // Disambiguate intents that share a target status.
    if (intent === 'withdraw' && article.status !== 'review') continue;
    if (intent === 'unpublish' && article.status !== 'published') continue;
    if (intent === 'restore' && article.status !== 'archived') continue;
    out.push(intent);
  }
  return out;
}

export function canManageTaxonomy(actor: Actor): boolean {
  return isEditorial(actor);
}

export function canSetFeatured(actor: Actor): boolean {
  return isEditorial(actor);
}

export function canChooseAnyByline(actor: Actor): boolean {
  return isEditorial(actor);
}
