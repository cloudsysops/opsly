import { expect, test } from '@playwright/test';

test('First Portal playable loop persists after reload', async ({ page }) => {
  await page.goto('/universe/play');
  await page.getByRole('button', { name: 'Begin' }).click();
  await page.getByLabel('Alias').fill('Explorer NovaBlue');
  await page.getByRole('button', { name: 'Wake in NEXUS' }).click();
  await expect(page.getByRole('heading', { name: 'NEXUS' })).toBeVisible();
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
  await page.getByRole('button', { name: 'Return to NEXUS' }).click();
  await expect(page.getByText(/Glowing, still locked/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Glowing, still locked|The machine breathes|Still being drawn/)).toBeVisible();
  await expect(page.getByText(/Explorer NovaBlue/)).toBeVisible();
});
