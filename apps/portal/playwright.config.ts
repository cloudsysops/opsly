import { defineConfig } from '@playwright/test';

const BASE_URL = process.env.PORTAL_URL ?? 'http://localhost:3002';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { browserName: 'chromium' },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run start',
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
