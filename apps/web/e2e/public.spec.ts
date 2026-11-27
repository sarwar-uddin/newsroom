import { expect, test } from '@playwright/test';

test.describe('public site', () => {
  test('homepage shows published stories and no drafts', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Who Watches the Watchers/ })).toBeVisible();
    await expect(page.getByText('Example of a Story Still in Progress')).toHaveCount(0);
    await expect(page.getByText('Example of a Story Awaiting an Editor')).toHaveCount(0);
  });

  test('article page renders with metadata and structured data', async ({ page }) => {
    const res = await page.goto('/articles/the-appetite-for-humiliation');
    expect(res?.status()).toBe(200);
    await expect(
      page.getByRole('heading', { level: 1, name: 'The Appetite for Humiliation' }),
    ).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      /\/articles\/the-appetite-for-humiliation$/,
    );
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'article');
    await expect(page.locator('meta[property="og:image"]').first()).toHaveAttribute(
      'content',
      /\/media\//,
    );
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
      'content',
      'summary_large_image',
    );
    const ld = JSON.parse(
      (await page.locator('script[type="application/ld+json"]').textContent()) ?? '{}',
    );
    expect(ld['@type']).toBe('NewsArticle');
    expect(ld.headline).toBe('The Appetite for Humiliation');
    await expect(page.getByRole('heading', { name: 'Read next' })).toBeVisible();
  });

  test('drafts, review copies and missing pages return 404', async ({ request }) => {
    for (const path of [
      '/articles/example-story-still-in-progress',
      '/articles/example-story-awaiting-an-editor',
      '/articles/does-not-exist',
      '/section/nope',
      '/authors/nope',
      '/section/opinion?page=99',
    ]) {
      expect((await request.get(path)).status(), path).toBe(404);
    }
  });

  test('section, author, tag and search pages work', async ({ page }) => {
    await page.goto('/section/investigations');
    await expect(page.getByRole('heading', { level: 1, name: 'Investigations' })).toBeVisible();
    await page.goto('/authors/tanvir-hasan');
    await expect(page.getByRole('heading', { level: 1, name: 'Tanvir Hasan' })).toBeVisible();
    await expect(page.getByText('Example of a Story Still in Progress')).toHaveCount(0);
    await page.goto('/tags/moral-policing');
    await expect(page.getByRole('heading', { level: 1, name: 'Moral policing' })).toBeVisible();
    await page.goto('/search');
    await page.getByLabel('Search articles').fill('ownership');
    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('heading', { name: /Who Owns the News/ })).toBeVisible();
    // The seeded draft mentions "visibility rules"; search must not find it.
    await page.goto('/search?q=visibility%20rules');
    await expect(page.getByText('No results')).toBeVisible();
  });

  test('RSS, sitemap and robots are valid and exclude drafts', async ({ request }) => {
    const rss = await request.get('/rss.xml');
    expect(rss.headers()['content-type']).toContain('application/rss+xml');
    const xml = await rss.text();
    expect(xml).toContain('<title>The Appetite for Humiliation</title>');
    expect(xml).not.toContain('example-story-still-in-progress');
    const sitemap = await (await request.get('/sitemap.xml')).text();
    expect(sitemap).toContain('/articles/the-appetite-for-humiliation');
    expect(sitemap).not.toContain('example-story');
    const robots = await (await request.get('/robots.txt')).text();
    expect(robots).toContain('Disallow: /admin');
  });

  test('mobile layout has no horizontal overflow', async ({ browser }) => {
    const page = await browser.newPage({ viewport: { width: 375, height: 800 } });
    for (const path of [
      '/',
      '/articles/notes-toward-an-investigation-of-moral-policing',
      '/section/culture',
      '/search?q=music',
    ]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
    await page.close();
  });
});
