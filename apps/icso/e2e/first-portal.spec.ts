import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const SHOT_DIR = join(process.cwd(), '../../runtime/universe-play-shots');

async function shot(page: Page, name: string): Promise<void> {
  mkdirSync(SHOT_DIR, { recursive: true });
  await page.screenshot({ path: join(SHOT_DIR, `${name}.png`), fullPage: true });
}

test('First Portal unlocks WILD and Dewthread connection persists', async ({ page }) => {
  await page.goto('/universe/play');
  await shot(page, '01-title');
  await page.getByRole('button', { name: 'Begin' }).click();
  await page.getByLabel('Alias').fill('Explorer NovaBlue');
  await shot(page, '02-explorer');
  await page.getByRole('button', { name: 'Wake in NEXUS' }).click();
  await expect(page.getByRole('heading', { name: 'NEXUS' })).toBeVisible();
  await shot(page, '03-nexus');
  await page.getByRole('button', { name: 'Listen' }).click();
  await expect(page.getByText('NØVA')).toBeVisible();
  while (await page.getByRole('button', { name: 'Continue' }).isVisible()) {
    await page.getByRole('button', { name: 'Continue' }).click();
  }
  await page.getByRole('button', { name: /FIRST PORTAL/i }).click();
  await page.getByRole('button', { name: /Light/ }).click();
  await page.getByRole('button', { name: /Sensor/ }).click();
  await expect(page.getByText(/Not yet/)).toBeVisible();
  await page.getByRole('button', { name: /Sensor/ }).click();
  await page.getByRole('button', { name: /Controller/ }).click();
  await page.getByRole('button', { name: /Controller/ }).click();
  await page.getByRole('button', { name: /Light/ }).click();
  await expect(page.getByRole('heading', { name: 'The machine breathes' })).toBeVisible();
  await expect(page.getByText(/Systems Fragment|Knowledge|Map Fragment/i).first()).toBeVisible();
  await shot(page, '04-first-portal-complete');
  await page.getByRole('button', { name: 'Return to NEXUS' }).click();
  await expect(page.getByRole('button', { name: /WILD/i })).toBeEnabled();
  await page.getByRole('button', { name: /WILD/i }).click();
  await expect(page.getByRole('heading', { name: /WILD/i })).toBeVisible();
  await shot(page, '05-wild');
  await page.getByRole('button', { name: 'Look into the canopy' }).click();
  await expect(page.getByRole('heading', { name: 'Dewthread' })).toBeVisible();
  await shot(page, '07-first-bit');
  await page.getByRole('button', { name: 'Ask Maya' }).click();
  await expect(page.getByText(/Dewthread is stuck/i)).toBeVisible();
  await shot(page, '06-maya');
  await page.getByRole('button', { name: 'Return to the vine' }).click();
  await page.getByRole('button', { name: 'Build a brace' }).click();
  await expect(page.getByRole('heading', { name: 'Connection formed' })).toBeVisible();
  await shot(page, '08-connection');
  await page.getByRole('button', { name: 'Open Bit Card' }).click();
  await expect(page.getByRole('heading', { name: /Dewthread Card/i })).toBeVisible();
  await shot(page, '09-bit-card');
  await page.getByRole('button', { name: 'Return to NEXUS' }).click();
  await expect(page.getByText(/Explorer NovaBlue/)).toBeVisible();
  await shot(page, '10-nexus-return');
  await page.reload();
  await expect(page.getByText(/Explorer NovaBlue/)).toBeVisible();
  await expect(page.getByRole('button', { name: /WILD/i })).toBeEnabled();
});
