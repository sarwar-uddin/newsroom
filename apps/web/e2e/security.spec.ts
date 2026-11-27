import { expect, test } from '@playwright/test';
import { articleIdBySlug, login } from './helpers';

test.describe('access control', () => {
  test('anonymous visitors are sent to login for every CMS page', async ({ page }) => {
    for (const path of [
      '/admin',
      '/admin/articles',
      '/admin/articles/new',
      '/admin/media',
      '/admin/sections',
    ]) {
      await page.goto(path);
      await expect(page, path).toHaveURL(/\/admin\/login$/);
    }
  });

  test('a forged session cookie does not grant access', async ({ page, context }) => {
    await context.addCookies([
      // Production uses the __Host- prefixed name; Chromium accepts Secure cookies on localhost.
      {
        name: '__Host-newsroom_session',
        value: 'a'.repeat(43),
        domain: 'localhost',
        path: '/',
        secure: true,
      },
      { name: 'newsroom_session', value: 'a'.repeat(43), domain: 'localhost', path: '/' },
    ]);
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login$/);
    const preview = await page.goto(
      `/admin/articles/${await articleIdBySlug('example-story-still-in-progress')}/preview`,
    );
    await expect(page).toHaveURL(/\/admin\/login$/);
    expect(preview?.status()).toBe(200);
  });

  test('anonymous uploads are refused', async ({ request }) => {
    const res = await request.post('/admin/api/media', {
      headers: { origin: 'http://localhost:3100' },
      multipart: { file: { name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('x') } },
    });
    expect(res.status()).toBe(401);
  });

  test('cross-origin uploads are refused even when signed in', async ({ page }) => {
    await login(page, 'editor');
    const res = await page.request.post('/admin/api/media', {
      headers: { origin: 'https://evil.example' },
      multipart: { file: { name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('x') } },
    });
    expect(res.status()).toBe(403);
  });

  test('invalid uploads are rejected', async ({ page }) => {
    await login(page, 'editor');
    const res = await page.request.post('/admin/api/media', {
      headers: { origin: 'http://localhost:3100' },
      multipart: {
        file: {
          name: 'evil.png',
          mimeType: 'image/png',
          buffer: Buffer.from('<?php system($_GET["c"]); ?>'),
        },
      },
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).error).toMatch(/Only JPEG, PNG, WebP and GIF/);
  });

  test('wrong credentials show a generic error', async ({ page }) => {
    await page.goto('/admin/login');
    await page.getByLabel('Email').fill('editor@e2e.test');
    await page.getByLabel('Password').fill('definitely-wrong-password');
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByText('Email or password is incorrect.')).toBeVisible();
  });

  test('authors cannot open other people’s drafts or publish', async ({ page }) => {
    await login(page, 'author');
    const draftId = await articleIdBySlug('example-story-still-in-progress');
    const res = await page.goto(`/admin/articles/${draftId}`);
    expect(res?.status()).toBe(404);
    expect((await page.goto(`/admin/articles/${draftId}/preview`))?.status()).toBe(404);
    await page.goto('/admin/articles/new');
    await expect(page.getByRole('button', { name: 'Save draft' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Publish' })).toHaveCount(0);
    await page.goto('/admin/sections');
    await expect(page).toHaveURL(/\/admin\?denied=1$/);
  });
});
