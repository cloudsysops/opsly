import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname),
      '@intcloudsysops/franchise-core': path.resolve(__dirname, '../../lib/franchise-core/src/index.ts'),
      '@intcloudsysops/franchise-persistence': path.resolve(__dirname, '../../lib/franchise-persistence/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: [
      'lib/**/*.test.ts',
      'app/**/*.test.ts',
      'components/**/*.test.ts',
      '__tests__/**/*.test.ts',
    ],
  },
})
