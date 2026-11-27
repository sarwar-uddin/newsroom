import { describe, expect, it } from 'vitest';
import {
  availableIntents,
  canDeleteArticle,
  canEditArticle,
  canTransition,
  canViewArticle,
  isValidTransition,
  type Actor,
} from '@/server/content/workflow';

const admin: Actor = { id: 'a', role: 'admin', authorId: null };
const editor: Actor = { id: 'e', role: 'editor', authorId: null };
const author: Actor = { id: 'w', role: 'author', authorId: 'byline-w' };
const own = (status: 'draft' | 'review' | 'published' | 'archived') => ({ status, createdBy: 'w' });
const others = (status: 'draft' | 'review' | 'published' | 'archived') => ({
  status,
  createdBy: 'someone-else',
});

describe('editorial permissions', () => {
  it('lets editors and admins do everything valid', () => {
    for (const actor of [admin, editor]) {
      expect(canEditArticle(actor, others('published'))).toBe(true);
      expect(canTransition(actor, others('draft'), 'published')).toBe(true);
      expect(canTransition(actor, others('published'), 'draft')).toBe(true);
    }
  });

  it('lets authors edit only their own drafts', () => {
    expect(canEditArticle(author, own('draft'))).toBe(true);
    expect(canEditArticle(author, own('review'))).toBe(false);
    expect(canEditArticle(author, own('published'))).toBe(false);
    expect(canEditArticle(author, others('draft'))).toBe(false);
    expect(canViewArticle(author, others('draft'))).toBe(false);
  });

  it('never lets authors publish, unpublish or archive', () => {
    expect(canTransition(author, own('draft'), 'published')).toBe(false);
    expect(canTransition(author, own('review'), 'published')).toBe(false);
    expect(canTransition(author, own('draft'), 'archived')).toBe(false);
    expect(canTransition(author, own('published'), 'draft')).toBe(false);
  });

  it('lets authors submit and withdraw their own work', () => {
    expect(canTransition(author, own('draft'), 'review')).toBe(true);
    expect(canTransition(author, own('review'), 'draft')).toBe(true);
    expect(canTransition(author, others('draft'), 'review')).toBe(false);
  });

  it('rejects transitions that are not in the workflow', () => {
    expect(isValidTransition('archived', 'published')).toBe(false);
    expect(isValidTransition('published', 'review')).toBe(false);
    expect(canTransition(admin, others('archived'), 'published')).toBe(false);
  });

  it('requires unpublishing before deletion', () => {
    expect(canDeleteArticle(admin, others('published'))).toBe(false);
    expect(canDeleteArticle(admin, others('archived'))).toBe(true);
    expect(canDeleteArticle(author, own('draft'))).toBe(true);
    expect(canDeleteArticle(author, others('draft'))).toBe(false);
  });

  it('offers intents matching the rules', () => {
    expect(availableIntents(author, own('draft'))).toEqual(['save', 'submit']);
    expect(availableIntents(author, own('review'))).toEqual(['withdraw']);
    expect(availableIntents(editor, others('published'))).toEqual(['save', 'unpublish', 'archive']);
    expect(availableIntents(editor, others('archived'))).toEqual(['save', 'restore']);
  });
});
