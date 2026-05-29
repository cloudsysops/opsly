import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/__tests__/**/*.test.ts',
      '__tests__/hermes.test.ts',
      '__tests__/queen-bee-utils.test.ts',
      'src/hermes/__tests__/context-enricher.test.ts',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/lib/validation/validation-metrics.ts',
        'src/lib/validation/validation-feedback.ts',
        'src/lib/validation/validation-dashboard.ts',
        'src/lib/local-worker-pool.ts',
      ],
      exclude: ['src/__tests__/**', 'src/types/**'],
      lines: 85,
      functions: 85,
      branches: 80,
      statements: 85,
    },
  },
});
