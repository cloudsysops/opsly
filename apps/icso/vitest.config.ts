import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '@intcloudsysops/game-core': path.resolve(__dirname, '../../lib/game-core/src/index.ts'),
      '@intcloudsysops/game-web': path.resolve(__dirname, '../../lib/game-web/src/index.ts'),
      '@intcloudsysops/universe': path.resolve(__dirname, '../../lib/universe/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['lib/**/*.test.ts', 'app/**/*.test.ts'],
  },
});
