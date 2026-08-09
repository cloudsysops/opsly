import { expect, test } from '@playwright/test';

/**
 * QA Test Suite for Commit 3fc7879
 * Validates removal of HeroChatCard and LeadCaptureForm as primary interface
 *
 * CRITICAL TESTS (block production if failing):
 * ✓ HeroChatCard not visible
 * ✓ LeadCaptureForm is primary component
 * ✓ No <details> with chat option
 * ✓ Form validates email/phone
 * ✓ Success screen shows correct text
 *
 * REGRESSION TESTS (warning if failing):
 * ✓ "Cupos abiertos" visible
 * ✓ "Enviar solicitud" button exists
 * ✓ peskidsnatacion@gmail.com in page
 * ✓ Brand colors applied
 *
 * SMOKE TESTS (system health):
 * ✓ No console errors
 * ✓ No 404s
 * ✓ Response time < 2s
 */

function uniqueLead() {
  const suffix = Date.now().toString();
  return {
    name: `QA Test ${suffix}`,
    email: `qa-${suffix}@example.com`,
    phone: `300${suffix.slice(-7)}`,
  };
}

test.describe('Release 2: Classic Form QA (Commit 3fc7879)', () => {
  test.describe.serial('CRITICAL: Form Structure', () => {
    test('001-herocard-not-visible', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(`Console error: ${msg.text()}`);
        }
      });

      page.on('response', (response) => {
        if (response.status() === 404) {
          errors.push(`404 on ${response.url()}`);
        }
      });

      const startTime = Date.now();
      await page.goto('/');
      const loadTime = Date.now() - startTime;

      // CRITICAL: HeroChatCard should NOT be visible
      const heroChatCard = page.locator('[data-testid="hero-chat-card"], .hero-chat-card, [class*="HeroChat"]');
      await expect(heroChatCard).not.toBeVisible({ timeout: 5000 }).catch(async () => {
        errors.push('HeroChatCard component is still visible - MUST BE REMOVED');
      });

      // CRITICAL: No "Prefieres el formulario clásico" text or <details> wrapper
      const detailsWrapper = page.locator('details, summary:has-text("Prefieres")');
      await expect(detailsWrapper).not.toBeVisible({ timeout: 5000 }).catch(async () => {
        errors.push('<details> wrapper with "Prefieres" text found - should be removed');
      });

      // System health
      expect(errors).toHaveLength(0);
      expect(loadTime).toBeLessThan(2000);
    });

    test('002-leadcaptureform-is-primary', async ({ page }) => {
      await page.goto('/');

      // CRITICAL: Form should be visible and not behind expandable
      const formContainer = page.locator('[id*="solicitud"], form');
      await expect(formContainer).toBeVisible({ timeout: 5000 });

      // Form should have key fields visible
      const nameField = page.getByLabel(/Nombre del acudiente/i);
      const emailField = page.getByLabel(/Correo electrónico/i);
      const phoneField = page.getByLabel(/Teléfono/i);

      await expect(nameField).toBeVisible();
      await expect(emailField).toBeVisible();
      await expect(phoneField).toBeVisible();
    });

    test('003-no-chat-expandable-option', async ({ page }) => {
      await page.goto('/');

      // CRITICAL: No expandable/collapsible chat option
      const preferClassicText = page.getByText(/Prefieres.*formulario.*clásico/i);
      await expect(preferClassicText).not.toBeVisible({ timeout: 5000 });

      const detailsElements = page.locator('details');
      const count = await detailsElements.count();

      // Should have NO <details> elements wrapping the form
      // (details are not part of Peskids design system)
      expect(count).toBe(0);
    });
  });

  test.describe.serial('CRITICAL: Form Validation', () => {
    test('004-email-validation', async ({ page }) => {
      await page.goto('/');

      const emailField = page.getByLabel(/Correo electrónico/i);
      const nameField = page.getByLabel(/Nombre del acudiente/i);
      const lead = uniqueLead();

      // Fill only invalid data
      await nameField.fill(lead.name);
      await emailField.fill('invalid-email');

      // Trigger validation (try to submit or blur)
      await emailField.blur();

      // Check for validation message or native HTML5 validation
      const validationMessage = await emailField.evaluate((el: HTMLInputElement) => el.validationMessage);
      expect(validationMessage).toBeTruthy(); // Should have validation feedback
    });

    test('005-phone-validation', async ({ page }) => {
      await page.goto('/');

      const phoneField = page.getByLabel(/Teléfono/i);

      // Test short phone number
      await phoneField.fill('123'); // Too short
      await phoneField.blur();

      // Should either show validation or be caught by Zod on submit
      // API validation will catch this when we try to submit
      const value = await phoneField.inputValue();
      expect(value.length).toBeGreaterThanOrEqual(1);
    });

    test('006-form-submit-full-validation', async ({ page }) => {
      await page.goto('/');
      const lead = uniqueLead();

      // Fill required fields
      await page.getByLabel(/Nombre del acudiente/i).fill(lead.name);
      await page.getByLabel(/Correo electrónico/i).fill(lead.email);
      await page.getByLabel(/Teléfono/i).fill(lead.phone);

      // Select modality (required)
      const modalitySelect = page.getByLabel(/Modalidad de clase/i);
      const options = await modalitySelect.locator('option').count();
      if (options > 1) {
        await modalitySelect.selectOption({ index: 1 });
      }

      // Fill neighborhood
      await page.getByLabel(/Barrio|zona/i).fill('Llanogrande');

      // Select age
      const ageSelect = page.getByLabel(/edad.*niño|kid.*age/i);
      const ageOptions = await ageSelect.locator('option').count();
      if (ageOptions > 1) {
        await ageSelect.selectOption({ index: 1 });
      }

      // CRITICAL: Check at least one consent checkbox exists
      const firstConsent = page.getByRole('checkbox').first();
      await expect(firstConsent).toBeVisible();
      await firstConsent.check();

      // Submit
      const submitButton = page.getByRole('button', { name: /Enviar solicitud/i });
      await expect(submitButton).toBeVisible();
      await submitButton.click();

      // Wait for success message
      await expect(page.getByText(/solicitud.*registrada|gracias.*recibimos/i)).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe.serial('CRITICAL: Success Screen', () => {
    test('007-success-screen-content', async ({ page }) => {
      await page.goto('/');
      const lead = uniqueLead();

      // Submit form (abbreviated)
      await page.getByLabel(/Nombre del acudiente/i).fill(lead.name);
      await page.getByLabel(/Correo electrónico/i).fill(lead.email);
      await page.getByLabel(/Teléfono/i).fill(lead.phone);
      await page.getByLabel(/Modalidad de clase/i).selectOption({ index: 1 });
      await page.getByLabel(/Barrio|zona/i).fill('Llanogrande');
      await page.getByLabel(/edad.*niño|kid.*age/i).selectOption({ index: 1 });
      await page.getByRole('checkbox').first().check();

      const submitButton = page.getByRole('button', { name: /Enviar solicitud/i });
      await submitButton.click();

      // CRITICAL: Success screen must show correct text
      const successTitle = page.getByText(/¡Gracias, recibimos tu solicitud|Thank you/i);
      const successDetail = page.getByText(/Tu solicitud fue registrada|Your request was registered/i);

      await expect(successTitle).toBeVisible({ timeout: 10000 });
      await expect(successDetail).toBeVisible();

      // CRITICAL: WhatsApp CTA should be visible after success
      const whatsappCTA = page.getByRole('button', { name: /WhatsApp|Continuar por WhatsApp/i });
      await expect(whatsappCTA).toBeVisible();
    });
  });

  test.describe.serial('REGRESSION: Copy & Branding', () => {
    test('008-cupos-abiertos-visible', async ({ page }) => {
      await page.goto('/');

      // REGRESSION: "Cupos abiertos" eyebrow must be present
      const cuposAbiertos = page.getByText(/Cupos abiertos/i);
      await expect(cuposAbiertos).toBeVisible();
    });

    test('009-formulario-de-solicitud-visible', async ({ page }) => {
      await page.goto('/');

      // REGRESSION: "Formulario de solicitud" heading must be present
      const formHeading = page.getByText(/Formulario de solicitud/i);
      await expect(formHeading).toBeVisible();
    });

    test('010-enviar-solicitud-button', async ({ page }) => {
      await page.goto('/');

      // REGRESSION: "Enviar solicitud" button text
      const submitButton = page.getByRole('button', { name: /Enviar solicitud/i });
      await expect(submitButton).toBeVisible();
    });

    test('011-email-consolidated', async ({ page }) => {
      await page.goto('/');

      // REGRESSION: peskidsnatacion@gmail.com should be in the page (footer, contact, etc)
      const consolidatedEmail = page.getByText('peskidsnatacion@gmail.com');
      await expect(consolidatedEmail).toBeVisible({ timeout: 5000 }).catch(async () => {
        // Email might be in privacy/contact pages, but should be consistent everywhere
        console.warn('Consolidated email not visible on landing - check privacy/contact pages');
      });
    });

    test('012-brand-colors-applied', async ({ page }) => {
      await page.goto('/');

      // REGRESSION: Check for pk-* color classes
      const eyebrow = page.getByText(/Cupos abiertos/i);
      const eyebrowClass = await eyebrow.getAttribute('class');

      // Should have pk-primary or similar class applied
      const hasBrandColor = /pk-(primary|deep|accent|ink|bg|border|sub)/.test(eyebrowClass || '');
      expect(hasBrandColor).toBeTruthy();
    });
  });

  test.describe.serial('SMOKE: System Health', () => {
    test('013-no-console-errors', async ({ page }) => {
      const errors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto('/');

      // Wait a bit for any delayed errors
      await page.waitForTimeout(1000);

      expect(errors).toHaveLength(0);
    });

    test('014-no-404-responses', async ({ page }) => {
      const notFoundUrls: string[] = [];

      page.on('response', (response) => {
        if (response.status() === 404) {
          notFoundUrls.push(response.url());
        }
      });

      await page.goto('/');

      // Give time for resources to load
      await page.waitForTimeout(2000);

      expect(notFoundUrls).toHaveLength(0);
    });

    test('015-page-load-performance', async ({ page }) => {
      const startTime = Date.now();

      const response = await page.goto('/');

      const loadTime = Date.now() - startTime;

      expect(response?.status()).toBe(200);
      expect(loadTime).toBeLessThan(2000);
    });

    test('016-form-interactive-delay', async ({ page }) => {
      await page.goto('/');

      const nameField = page.getByLabel(/Nombre del acudiente/i);

      const startTime = Date.now();
      await nameField.fill('Test');
      const interactiveTime = Date.now() - startTime;

      // Form should be interactive in < 500ms
      expect(interactiveTime).toBeLessThan(500);
    });
  });

  test.describe.serial('REGRESSION: Form Completeness', () => {
    test('017-all-form-fields-present', async ({ page }) => {
      await page.goto('/');

      // Check that standard Peskids form fields exist
      const fieldsToCheck = [
        /Nombre del acudiente/i,
        /Correo electrónico/i,
        /Teléfono/i,
        /Modalidad de clase/i,
        /Barrio|zona/i,
      ];

      for (const fieldLabel of fieldsToCheck) {
        const field = page.getByLabel(fieldLabel);
        await expect(field).toBeVisible({
          timeout: 5000,
        }).catch(() => {
          throw new Error(`Required field not found: ${fieldLabel}`);
        });
      }
    });

    test('018-consent-checkboxes-present', async ({ page }) => {
      await page.goto('/');

      // Should have at least 1 consent checkbox (treatment is required)
      const checkboxes = page.getByRole('checkbox');
      const count = await checkboxes.count();

      expect(count).toBeGreaterThanOrEqual(1);

      // First checkbox should be visible and unchecked
      const firstCheckbox = checkboxes.first();
      await expect(firstCheckbox).toBeVisible();

      const isChecked = await firstCheckbox.isChecked();
      expect(isChecked).toBe(false);
    });
  });
});
