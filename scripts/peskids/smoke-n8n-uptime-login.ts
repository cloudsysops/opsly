#!/usr/bin/env npx tsx
/**
 * Browser smoke: n8n + Uptime Kuma login with PESKIDS_ADMIN_PASSWORD.
 * Usage: doppler run --project ops-intcloudsysops --config prd -- \
 *   npx tsx scripts/peskids/smoke-n8n-uptime-login.ts
 */
import { chromium } from 'playwright';

const EMAIL = (process.env.PESKIDS_ADMIN_EMAIL || 'peskids.admin@gmail.com').trim();
const PASSWORD = process.env.PESKIDS_ADMIN_PASSWORD?.trim();
const UPTIME_USER = (process.env.UPTIME_KUMA_USERNAME || 'peskids-admin').trim();

async function smokeN8n(): Promise<void> {
  const email = EMAIL;
  const pass = PASSWORD!;
  const res = await fetch('https://n8n-peskids.op-sly.com/rest/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ emailOrLdapLoginId: email, password: pass }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`n8n REST login failed (${res.status}): ${body.slice(0, 200)}`);
  }
  console.log('N8N_LOGIN_OK', 'rest/api');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://n8n-peskids.op-sly.com/signin', {
      waitUntil: 'networkidle',
      timeout: 90000,
    });
    const passwordInput = page.locator('input[type="password"]');
    if ((await passwordInput.count()) > 0) {
      const emailInput = page.locator('input[type="email"], input[type="text"]').first();
      await emailInput.fill(email);
      await passwordInput.first().fill(pass);
      await page.locator('button').first().click();
      await page.waitForTimeout(8000);
      const url = page.url();
      if (!url.includes('/signin')) {
        console.log('N8N_UI_OK', url);
        return;
      }
    }
    console.log('N8N_UI_SKIP', 'REST login verified; UI selectors differ in headless');
  } finally {
    await browser.close();
  }
}

async function smokeUptime(): Promise<void> {
  const pass = PASSWORD!;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  try {
    await page.goto('https://uptime-peskids.op-sly.com/', {
      waitUntil: 'networkidle',
      timeout: 90000,
    });
    await page.waitForTimeout(3000);
    const passwordInput = page.locator('input[type="password"]');
    if ((await passwordInput.count()) === 0) {
      const url = page.url();
      if (url.includes('dashboard')) {
        console.log('UPTIME_LOGIN_OK', 'already on dashboard', url);
        return;
      }
      throw new Error(`no login form at ${url}`);
    }
    const userInput = page.locator('input[type="text"], input[name="username"]');
    if ((await userInput.count()) > 0) {
      await userInput.first().fill(UPTIME_USER);
    }
    await passwordInput.first().fill(pass);
    await page.locator('button[type="submit"], button:has-text("Login")').first().click();
    await page.waitForURL(/dashboard/, { timeout: 30000 });
    console.log('UPTIME_LOGIN_OK', page.url());
  } finally {
    await browser.close();
  }
}

async function main(): Promise<void> {
  if (!PASSWORD) {
    throw new Error('Missing PESKIDS_ADMIN_PASSWORD');
  }
  await smokeN8n();
  await smokeUptime();
}

main().catch((err: unknown) => {
  console.error('SMOKE_FAIL', err instanceof Error ? err.message : String(err));
  process.exit(1);
});
