/**
 * Capa 2 — ESLint 9 (flat config)
 *
 * Grupos de reglas (detalle en .eslintrc.json):
 * - Complejidad y tamaño: complexity, max-lines-per-function → funciones legibles.
 * - Números mágicos: no-magic-numbers con excepciones habituales.
 * - TypeScript: sin any explícito; tipos de retorno explícitos (warn).
 * - Estilo: sin ternarios anidados, prefer-const, eqeqeq estricto.
 *
 * ESLint 9 usa este archivo; .eslintrc.json se integra vía FlatCompat para una sola fuente de reglas.
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
    ignores: [
      'apps/admin/**',
      'apps/web/**',
      '**/node_modules/**',
      '**/.next/**',
      '**/dist/**',
      'coverage/**',
      'apps/api/next-env.d.ts',
    ],
  },
  ...compat.config(eslintrc),
];
