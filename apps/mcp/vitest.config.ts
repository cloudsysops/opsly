import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', '__tests__/**/*.test.ts'],
    deps: {
      external: ['@intcloudsysops/notebooklm-agent'],
    },
  },
});
