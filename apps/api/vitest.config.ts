import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/.next/**', '**/dist/**'],
    passWithNoTests: false,
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: ['app/api/**/route.ts'],
      exclude: ['**/*.test.ts'],
      thresholds: {
        lines: 80,
        functions: 75,
        branches: 70,
        statements: 80,
      },
    },
  },
});
