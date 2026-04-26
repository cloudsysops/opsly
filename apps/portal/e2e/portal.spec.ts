import { test, expect } from '@playwright/test';

const hasSupabase =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

test.describe('Portal — public pages', () => {
  test('root redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders heading, email and password inputs', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Opsly' })).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/contraseña/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /entrar/i })).toBeVisible();
    expect(errors.filter((e) => !e.includes('favicon')).length).toBe(0);
  });

  test('invite page renders password form', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto('/invite/test-token');
    await expect(page.getByRole('heading')).toBeVisible();
    await expect(page.getByLabel('Nueva contraseña')).toBeVisible();
    await expect(page.getByLabel('Confirmar contraseña')).toBeVisible();
    await expect(page.getByRole('button', { name: /activar/i })).toBeVisible();
    expect(errors.filter((e) => !e.includes('favicon')).length).toBe(0);
  });

  test('invite page submits empty form without crash', async ({ page }) => {
    await page.goto('/invite/test-token');
    await page.getByRole('button', { name: /activar/i }).click();
    await page.waitForLoadState('networkidle');
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });
});

test.describe('Portal — auth-protected pages', () => {
  test.skip(
    () => !hasSupabase,
    'requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );

  test('dashboard redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test('dashboard/developer redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/developer');
    await expect(page).toHaveURL(/\/login/);
  });

  test('dashboard/managed redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard/managed');
    await expect(page).toHaveURL(/\/login/);
  });
});
