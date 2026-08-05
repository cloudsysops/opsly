/**
 * Local flat config for apps/peskids.
 *
 * ESLint 9+ resolves flat config by walking up from cwd and stopping at the
 * first eslint.config.* it finds — without this file, `cd apps/peskids &&
 * npx eslint .` (used by CI's lint job) would instead pick up the monorepo
 * root's eslint.config.mjs. Keep peskids rules intentionally lenient
 * (next/core-web-vitals + a couple of warnings).
 *
 * Use FlatCompat.extends only (no legacy overrides via compat.config) —
 * overrides through FlatCompat break with some minimatch resolutions
 * (`TypeError: expand is not a function` in @eslint/eslintrc OverrideTester).
 */
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'eslint.config.mjs'],
  },
  ...compat.extends('next/core-web-vitals'),
  {
    rules: {
      'prefer-const': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      '@next/next/no-img-element': 'off',
    },
  },
];
