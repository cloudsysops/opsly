import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('primary console buttons perform their actions', async ({ page }) => {
  const theater = page.locator('#game-theater');

  await expect(page.getByRole('heading', { name: '¿Cuál quieren probar primero?' })).toBeVisible();

  await page.locator('[data-play="meteor-dodge-godot"]').first().click();
  await expect(theater).toBeVisible();
  await expect(page.locator('#active-title')).toHaveText('Meteor Dodge+');
  await expect(page.locator('#game-canvas')).toBeVisible();

  await page.locator('#active-favorite').click();
  await expect(page.locator('#active-favorite')).toHaveAttribute('aria-pressed', 'true');

  await page.locator('#retry-game').click();
  await expect(page.locator('#active-title')).toHaveText('Meteor Dodge+');

  await page.locator('#next-game').click();
  await expect(page.locator('#active-title')).not.toHaveText('Meteor Dodge+');

  await page.locator('#close-game').click();
  await expect(theater).toBeHidden();
  await expect(page.locator('#recent-section')).toBeVisible();

  await expect(page.locator('#continue-game')).toBeVisible();
  await page.locator('#continue-game').click();
  await expect(theater).toBeVisible();
});

test('favorites and filters change the catalog', async ({ page }) => {
  await page.locator('[data-favorite="michelle-butterfly-quest"]').first().click();

  await page.getByRole('button', { name: '❤️ Favoritos' }).click();
  await expect(page.locator('[data-card-game="michelle-butterfly-quest"]').first()).toBeVisible();

  await page.getByRole('button', { name: 'Todos' }).click();
  await page.getByRole('button', { name: '📱 iPhone' }).click();
  await expect(page.locator('[data-card-game="aurora-sky-islands"]').first()).toBeVisible();

  await page.getByRole('button', { name: '👭 Juntas' }).click();
  await expect(page.locator('[data-card-game="sisters-crystal-arena"]').first()).toBeVisible();
});

test('feedback buttons persist the intended state', async ({ page }) => {
  await page.locator('[data-play="michelle-butterfly-quest"]').first().click();

  await page.getByRole('button', { name: '❤️ Me encantó' }).click();
  await expect(page.locator('#active-favorite')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#feedback-note')).toContainText('Guardado');

  await page.getByRole('button', { name: '🤔 Cambiaría algo' }).click();
  await expect(page.locator('#feedback-note')).toContainText('Después vemos qué cambiar');

  const playtests = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('astral-games-lab-playtests') || '[]')
  );
  expect(Array.isArray(playtests)).toBe(true);
});

test('surprise button opens a playable game and touch controls exist', async ({ page }) => {
  await page.locator('#surprise-game').click();
  await expect(page.locator('#game-theater')).toBeVisible();
  await expect(page.locator('#active-title')).not.toHaveText('Juego');

  const upstreamVisible = await page.locator('#upstream-frame').isVisible();
  if (!upstreamVisible) {
    await expect(page.locator('[data-control="left"]')).toBeVisible();
    await expect(page.locator('[data-control="action"]')).toBeVisible();
    await expect(page.locator('[data-control="right"]')).toBeVisible();
  }
});
