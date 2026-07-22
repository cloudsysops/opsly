/**
 * Local flat config for apps/peskids.
 *
 * ESLint 9+ resolves flat config by walking up from cwd and stopping at the
 * first eslint.config.* it finds — without this file, `cd apps/peskids &&
 * npx eslint .` (used by CI's lint job) would instead pick up the monorepo
 * root's eslint.config.mjs, which is much stricter (prettier formatting,
 * no-explicit-any, etc.) than peskids' own .eslintrc.json and was never run
 * against this app before. This file makes CI enforce peskids' own existing,
 * intentionally lenient rules (next/core-web-vitals + a couple of warnings)
 * instead of silently inheriting the root's, via the same FlatCompat
 * technique the root config itself uses.
 */
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

const eslintrc = require('./.eslintrc.json');

export default [
  {
    ignores: ['.next/**', 'node_modules/**', 'eslint.config.mjs'],
  },
  ...compat.config(eslintrc),
];
