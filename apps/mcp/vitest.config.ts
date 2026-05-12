import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    deps: {
      external: ['@intcloudsysops/notebooklm-agent'],
    },
  },
});
