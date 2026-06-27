import { defineConfig } from '@playwright/test';

const baseURL = process.env.PESKIDS_SMOKE_BASE_URL?.trim() || 'http://127.0.0.1:3004';
const useLocalServer = !process.env.PESKIDS_SMOKE_BASE_URL?.trim();

export default defineConfig({
  testDir: './e2e',
  testMatch: /release1-smoke\.spec\.ts/,
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  webServer: useLocalServer
    ? {
        command: 'npm run dev --workspace=peskids',
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      }
    : undefined,
});
