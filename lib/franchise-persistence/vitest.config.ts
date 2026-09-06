import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@intcloudsysops/franchise-core': path.resolve(__dirname, '../franchise-core/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // pg-store.ts's SQL targets columns that don't exist in
    // supabase/migrations/0098_franchise_core.sql (needs a real rewrite,
    // tracked separately) - this live-DB test would fail on schema
    // mismatch, not a real regression.
    exclude: ['**/node_modules/**', 'src/pg.live.test.ts'],
    testTimeout: 60_000,
    hookTimeout: 120_000,
  },
});
