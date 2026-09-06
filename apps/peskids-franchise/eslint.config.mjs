/**
 * Local flat config for apps/peskids-franchise.
 *
 * Standalone module (see README) — deliberately does not extend the Opsly
 * monorepo root's eslint.config.mjs (different code style, e.g. double
 * quotes) so it can be lifted into its own repo without dragging Opsly's
 * lint rules along. Mirrors apps/peskids/eslint.config.mjs's approach.
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
];
