import path from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { login, logout } from './helpers';

const TITLE = `End-to-end test story ${Date.now()}`;

async function fillNewArticle(page: Page, title: string) {
  await page.goto('/admin/articles/new');
  await page.getByLabel('Headline', { exact: true }).fill(title);
  await page.getByLabel('Standfirst / dek').fill('A dek written by the browser test.');
  const body = page.getByRole('textbox', { name: 'Article body' });
  await body.click();
  await page.keyboard.type('This paragraph was typed into the editor by Playwright.');
  await page.locator('select[name="categoryId"]').selectOption({ label: 'Society' });
  await page.getByLabel('Tags').fill('Testing, Browser');
}

test('editor: draft → preview → publish → edit → unpublish, with image upload', async ({
  page,
  request,
}) => {
  page.on('dialog', (d) => d.accept());
  await login(page, 'editor');
  await expect(page.getByText('Awaiting review')).toBeVisible();

  await fillNewArticle(page, TITLE);
  await page.locator('select[name="authorId"]').selectOption({ label: 'The Editors' });

  // Upload a featured image through the picker.
  await page
    .getByLabel('Image file')
    .setInputFiles(path.join(import.meta.dirname, 'fixtures', 'pixel.png'));
  await page.getByLabel('Alt text for the new image').fill('A single test pixel');
  await page.getByRole('button', { name: 'Upload', exact: true }).click();
  await expect(page.getByText('Alt: A single test pixel')).toBeVisible();

  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved.');
  const editUrl = page.url();
  expect(editUrl).toMatch(/\/admin\/articles\/[0-9a-f-]{36}\?done=save$/);
  const slug = await page.getByLabel('Slug').inputValue();
  expect(slug).toMatch(/^end-to-end-test-story-\d+$/);

  // Draft is private.
  expect((await request.get(`/articles/${slug}`)).status()).toBe(404);

  // Preview.
  const id = editUrl.match(/articles\/([0-9a-f-]{36})/)![1];
  await page.goto(`/admin/articles/${id}/preview`);
  await expect(page.getByRole('heading', { level: 1, name: TITLE })).toBeVisible();
  await expect(
    page.getByText('This paragraph was typed into the editor by Playwright.'),
  ).toBeVisible();

  // Publish.
  await page.goto(`/admin/articles/${id}`);
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByRole('status')).toContainText('Published');
  const pub = await request.get(`/articles/${slug}`);
  expect(pub.status()).toBe(200);
  expect(await pub.text()).toContain('This paragraph was typed into the editor by Playwright.');
  expect(await (await request.get('/')).text()).toContain(TITLE);
  expect(await (await request.get('/rss.xml')).text()).toContain(TITLE);

  // Edit the published article.
  await page.getByLabel('Standfirst / dek').fill('An updated dek.');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Saved.');
  expect(await (await request.get(`/articles/${slug}`)).text()).toContain('An updated dek.');

  // Unpublish.
  await page.getByRole('button', { name: 'Unpublish' }).click();
  await expect(page.getByRole('status')).toContainText('Unpublished');
  expect((await request.get(`/articles/${slug}`)).status()).toBe(404);
  expect(await (await request.get('/rss.xml')).text()).not.toContain(TITLE);

  await logout(page);
  await page.goto(`/admin/articles/${id}`);
  await expect(page).toHaveURL(/\/admin\/login$/);
});

test('validation errors keep what the writer typed', async ({ page }) => {
  await login(page, 'editor');
  await page.goto('/admin/articles/new');
  await page.getByLabel('Standfirst / dek').fill('A dek that must survive a failed save.');
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('A headline is required.')).toBeVisible();
  await expect(page.getByLabel('Standfirst / dek')).toHaveValue(
    'A dek that must survive a failed save.',
  );
});

test('author: writes a draft and submits it for review', async ({ page }) => {
  page.on('dialog', (d) => d.accept());
  await login(page, 'author');
  const title = `Author submission ${Date.now()}`;
  await fillNewArticle(page, title);
  await page.getByRole('button', { name: 'Submit for review' }).click();
  await expect(page.getByRole('status')).toHaveText('Submitted for review.');
  await expect(page.getByText('with the editors for review')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publish' })).toHaveCount(0);
  await logout(page);

  // An editor sees it awaiting review and can publish it.
  await login(page, 'editor');
  await page.goto('/admin/articles?status=review');
  await page.getByRole('link', { name: title }).click();
  await expect(page.locator('select[name="authorId"]')).toHaveValue(/.+/);
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page.getByRole('status')).toContainText('Published');
});
