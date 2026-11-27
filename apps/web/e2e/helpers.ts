import { expect, type Page } from '@playwright/test';
import postgres from 'postgres';
import { E2E_USERS } from './users';

export async function login(page: Page, who: keyof typeof E2E_USERS) {
  const u = E2E_USERS[who];
  await page.goto('/admin/login');
  await page.getByLabel('Email').fill(u.email);
  await page.getByLabel('Password').fill(u.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Sign out' }).first().click();
  await expect(page).toHaveURL(/\/admin\/login$/);
}

export async function articleIdBySlug(slug: string): Promise<string> {
  const sql = postgres(process.env.E2E_DATABASE_URL!, { max: 1 });
  try {
    const rows = await sql<{ id: string }[]>`select id from articles where slug = ${slug}`;
    if (!rows[0]) throw new Error(`No article ${slug}`);
    return rows[0].id;
  } finally {
    await sql.end();
  }
}
