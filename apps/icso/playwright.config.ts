import { defineConfig } from '@playwright/test';

const BASE_URL = process.env.ICSO_URL ?? 'http://127.0.0.1:3015';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  webServer: process.env.CI
    ? undefined
    : {
        command: 'npm run dev --workspace=@intcloudsysops/icso',
        cwd: '../..',
        url: `${BASE_URL}/universe/play`,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
