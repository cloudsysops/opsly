import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/__tests__/**/*.test.ts',
      '__tests__/hermes.test.ts',
      'src/hermes/__tests__/context-enricher.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/validation-metrics.ts',
        'src/lib/validation-feedback.ts',
        'src/lib/validation-dashboard.ts',
        'src/lib/local-worker-pool.ts',
      ],
      exclude: ['src/__tests__/**', 'src/types/**'],
      lines: 40,
      functions: 55,
      branches: 35,
      statements: 40,
    },
  },
});
