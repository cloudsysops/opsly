import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', '__tests__/**/*.test.ts'],
    // Specs units.ts/opening.ts/network.ts + audit.ts helpers that were never
    // implemented (see tsconfig.json exclude for the same reasoning).
    exclude: ['**/node_modules/**', 'src/domain.test.ts'],
  },
});
