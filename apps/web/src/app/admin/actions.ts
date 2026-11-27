'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { attemptLogin } from '@/server/auth/login';
import {
  clearSessionCookie,
  getClientIp,
  requireUser,
  SESSION_COOKIE,
  setSessionCookie,
} from '@/server/auth/current-user';
import { invalidateSession } from '@/server/auth/session';
import {
  createArticle,
  deleteArticle,
  transitionArticle,
  updateArticle,
} from '@/server/content/editorial';
import { DomainError } from '@/server/content/errors';
import { deleteCategory, deleteTag, saveAuthor, saveCategory } from '@/server/content/taxonomy';
import type { Intent } from '@/server/content/workflow';
import { updateMediaMeta } from '@/server/media/upload';

/**
 * Every CMS mutation lives here. Each action authenticates on its own (never relying on the
 * page that rendered the form), validates its input, and delegates authorization to the domain
 * layer. Next.js server actions are POST-only and reject cross-origin requests (Origin check),
 * which together with SameSite=Lax session cookies provides CSRF protection.
 */

export type ActionState = { message?: string; fieldErrors?: Record<string, string>; ok?: boolean };

function toState(error: unknown): ActionState {
  if (error instanceof DomainError)
    return { message: error.message, fieldErrors: error.fieldErrors };
  console.error(error);
  return { message: 'Something went wrong. Nothing was changed.' };
}

const uuid = z.uuid();
const intentSchema = z.enum([
  'save',
  'submit',
  'withdraw',
  'publish',
  'unpublish',
  'archive',
  'restore',
]);

function formRecord(fd: FormData): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of fd.entries()) if (typeof v === 'string' && !k.startsWith('$')) out[k] = v;
  return out;
}

// --- Auth -------------------------------------------------------------------

export async function loginAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const result = await attemptLogin(
    { email: fd.get('email'), password: fd.get('password') },
    await getClientIp(),
  );
  if (!result.ok) {
    return {
      message:
        result.reason === 'throttled'
          ? 'Too many failed attempts. Wait 15 minutes and try again.'
          : 'Email or password is incorrect.',
    };
  }
  await setSessionCookie(result.token, result.expiresAt);
  redirect('/admin');
}

export async function logoutAction(): Promise<void> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await invalidateSession(token);
  await clearSessionCookie();
  redirect('/admin/login');
}

// --- Articles ---------------------------------------------------------------

export async function saveArticleAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const intent = intentSchema.safeParse(fd.get('intent') ?? 'save');
  if (!intent.success) return { message: 'Unknown action.' };
  const raw = formRecord(fd);
  const id = fd.get('id');

  let savedId: string;
  try {
    if (typeof id === 'string' && id) {
      if (!uuid.safeParse(id).success) return { message: 'Article not found.' };
      const revision = Number.parseInt(String(fd.get('revision') ?? ''), 10);
      if (!Number.isInteger(revision)) return { message: 'Missing revision. Reload the page.' };
      savedId = (await updateArticle(user, id, raw, revision, intent.data as Intent)).id;
    } else {
      savedId = (await createArticle(user, raw, intent.data as Intent)).id;
    }
  } catch (error) {
    return toState(error);
  }
  revalidatePath('/', 'layout');
  redirect(`/admin/articles/${savedId}?done=${intent.data}`);
}

export async function transitionArticleAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const id = uuid.parse(fd.get('id'));
  const intent = intentSchema.exclude(['save']).parse(fd.get('intent'));
  try {
    await transitionArticle(user, id, intent);
  } catch (error) {
    if (error instanceof DomainError)
      redirect(`/admin/articles/${id}?error=${encodeURIComponent(error.message)}`);
    throw error;
  }
  revalidatePath('/', 'layout');
  redirect(`/admin/articles/${id}?done=${intent}`);
}

export async function deleteArticleAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  const id = uuid.parse(fd.get('id'));
  try {
    await deleteArticle(user, id);
  } catch (error) {
    if (error instanceof DomainError)
      redirect(`/admin/articles/${id}?error=${encodeURIComponent(error.message)}`);
    throw error;
  }
  redirect('/admin/articles?deleted=1');
}

// --- Taxonomy & bylines -----------------------------------------------------

export async function saveCategoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = fd.get('id');
  try {
    await saveCategory(
      user,
      typeof id === 'string' && uuid.safeParse(id).success ? id : null,
      formRecord(fd),
    );
  } catch (error) {
    return toState(error);
  }
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Saved.' };
}

export async function deleteCategoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    await deleteCategory(user, uuid.parse(fd.get('id')));
  } catch (error) {
    return toState(error);
  }
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Deleted.' };
}

export async function deleteTagAction(fd: FormData): Promise<void> {
  const user = await requireUser();
  await deleteTag(user, uuid.parse(fd.get('id')));
  revalidatePath('/admin/tags');
}

export async function saveAuthorAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  const id = fd.get('id');
  try {
    await saveAuthor(
      user,
      typeof id === 'string' && uuid.safeParse(id).success ? id : null,
      formRecord(fd),
    );
  } catch (error) {
    return toState(error);
  }
  revalidatePath('/', 'layout');
  return { ok: true, message: 'Saved.' };
}

export async function updateMediaAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const user = await requireUser();
  try {
    await updateMediaMeta(user, uuid.parse(fd.get('id')), {
      altText: fd.get('altText'),
      credit: fd.get('credit'),
    });
  } catch (error) {
    return toState(error);
  }
  return { ok: true, message: 'Saved.' };
}
