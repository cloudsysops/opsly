import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/index.html');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test('Games is the product home and Astral Arena is nested inside it', async ({ page }) => {
  await page.route('**/astral-arena/index.html', route =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Astral fixture</title>' })
  );
  await page.route('**/astral-arena/', route =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Astral fixture</title>' })
  );

  await expect(page.getByRole('heading', { name: 'Todo empieza en Games.' })).toBeVisible();
  await expect(page.locator('#first-party-grid [data-card-game="astral-arena"]')).toBeVisible();
  await page.locator('#first-party-grid [data-play="astral-arena"]').click();
  await expect(page.locator('#game-theater')).toBeVisible();
  await expect(page.locator('#active-title')).toHaveText('Astral Arena');
  await expect(page.locator('#upstream-frame')).toHaveAttribute('src', './astral-arena/');
  await page.locator('#close-game').click();
});

test('primary console buttons perform their actions', async ({ page }) => {
  const theater = page.locator('#game-theater');

  await expect(page.getByRole('heading', { name: 'Todo empieza en Games.' })).toBeVisible();

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

test('clone idea button stores a named remix', async ({ page }) => {
  await page.locator('[data-play="aurora-sky-islands"]').first().click();

  page.once('dialog', async dialog => {
    expect(dialog.type()).toBe('prompt');
    await dialog.accept('Aurora Rainbow Remix');
  });

  await page.getByRole('button', { name: '✨ Hagamos uno así' }).click();
  await expect(page.locator('#feedback-note')).toContainText('Idea guardada');

  const ideas = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('astral-retro-ideas') || '[]')
  );
  expect(ideas[0]?.title).toBe('Aurora Rainbow Remix');
  expect(ideas[0]?.sourceMechanic).toBe('aurora-sky-islands');
});

test('surprise button opens a touch-ready game', async ({ page }) => {
  await page.route('**/astral-arena/index.html', route =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Astral fixture</title>' })
  );
  await page.route('**/astral-arena/', route =>
    route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Astral fixture</title>' })
  );

  await page.getByRole('button', { name: '📱 iPhone' }).click();
  await page.locator('#surprise-game').click();
  await expect(page.locator('#game-theater')).toBeVisible();
  await expect(page.locator('#active-title')).not.toHaveText('Juego');

  const canvasVisible = await page.locator('#game-canvas').isVisible();
  const iframeVisible = await page.locator('#upstream-frame').isVisible();
  expect(canvasVisible || iframeVisible).toBe(true);
});

test('local playable games expose working touch controls', async ({ page }) => {
  await page.locator('[data-play="meteor-dodge-godot"]').first().click();
  await expect(page.locator('[data-control="left"]')).toBeVisible();
  await expect(page.locator('[data-control="action"]')).toBeVisible();
  await expect(page.locator('[data-control="right"]')).toBeVisible();

  await page.locator('[data-control="left"]').dispatchEvent('pointerdown', { pointerId: 1 });
  await page.locator('[data-control="left"]').dispatchEvent('pointerup', { pointerId: 1 });
  await page.locator('[data-control="action"]').dispatchEvent('pointerdown', { pointerId: 2 });
  await page.locator('[data-control="action"]').dispatchEvent('pointerup', { pointerId: 2 });
});
