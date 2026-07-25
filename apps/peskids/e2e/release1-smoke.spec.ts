import type { APIRequestContext, Page } from '@playwright/test';
import { expect, test } from '@playwright/test';

const adminEmail = process.env.PESKIDS_SMOKE_ADMIN_EMAIL?.trim() || '';
const adminPassword = process.env.PESKIDS_SMOKE_ADMIN_PASSWORD?.trim() || '';
const adminToken = process.env.PESKIDS_SMOKE_ADMIN_TOKEN?.trim() || '';

const canAuthenticate = Boolean((adminEmail && adminPassword) || adminToken);

function uniqueLead() {
  const suffix = Date.now().toString();
  return {
    name: `Smoke ${suffix}`,
    email: `smoke-${suffix}@example.com`,
    phone: `300${suffix.slice(-7)}`,
    note: `Nota smoke ${suffix}`,
  };
}

async function login(page: Page, request: APIRequestContext) {
  await page.goto('/admin/login');
  await expect(page.getByRole('heading', { name: /Acceso al panel|Entrar al panel/i })).toBeVisible();

  if (adminEmail && adminPassword) {
    await page.getByLabel('Email').fill(adminEmail);
    await page.getByLabel('Contraseña').fill(adminPassword);
    await page.getByRole('button', { name: /Acceder al dashboard|Acceder al panel/i }).click();
    await page.waitForURL('**/admin');
    return;
  }

  const response = await request.post('/api/admin/login', {
    data: { token: adminToken },
  });
  expect(response.ok()).toBeTruthy();
  await page.goto('/admin');
}

test.describe.serial('Peskids Release 1 smoke', () => {
  test.skip(!canAuthenticate, 'Set PESKIDS_SMOKE_ADMIN_EMAIL/PASSWORD or PESKIDS_SMOKE_ADMIN_TOKEN');

  test('covers home, login, form submit, admin update, note save, and logout', async ({
    page,
    request,
  }) => {
    const lead = uniqueLead();

    await page.goto('/');
    await expect(page).toHaveTitle(/Peskids/i);
    await expect(page.getByRole('heading', { name: /Peskids/i }).first()).toBeVisible();

    await page.getByLabel('Nombre del acudiente').fill(lead.name);
    await page.getByLabel('Correo electrónico').fill(lead.email);
    await page.getByLabel(/Teléfono/).fill(lead.phone);
    await page.getByLabel('Modalidad de clase').selectOption({ index: 1 });
    await page.getByLabel('Barrio o zona').fill('Llanogrande');
    await page.getByLabel('Edad del niño(a)').selectOption('6-8');
    await page.getByLabel('¿Cómo nos conociste?').selectOption('Other');
    await page
      .getByRole('checkbox')
      .first()
      .check();
    await page.getByRole('button', { name: /Enviar solicitud de contacto/i }).click();
    await expect(page.getByText(/Tu solicitud quedó registrada correctamente/i)).toBeVisible();

    await login(page, request);
    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByText('Interesados nuevos')).toBeVisible();

    const leadCard = page.locator('li').filter({ hasText: lead.email }).first();
    await expect(leadCard).toBeVisible({ timeout: 20_000 });
    await expect(leadCard.getByText('Otro')).toBeVisible();

    const markContacted = leadCard.getByRole('button', { name: /Marcar contactado/i });
    if (await markContacted.isVisible()) {
      await markContacted.click();
      await expect(leadCard.getByText(/Interesado marcado como contactado/i)).toBeVisible();
    }

    await leadCard.getByLabel('Nota rápida').fill(lead.note);
    await leadCard.getByRole('button', { name: /Guardar nota/i }).click();
    await expect(leadCard.getByText(/Nota guardada/i)).toBeVisible();

    await page.getByRole('button', { name: /Cerrar sesión/i }).click();
    await page.waitForURL('**/admin/login');
    await expect(page.getByRole('heading', { name: /Acceso al panel/i })).toBeVisible();
  });
});
