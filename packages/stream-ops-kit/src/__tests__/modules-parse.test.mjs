import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Guardia contra un fallo que ya ocurrio dos veces (preflight.mjs y auto-start.mjs): un "\\n" literal pegado dentro del codigo
// rompe el modulo entero sin que ninguna prueba lo note, y se descubre justo antes del directo.
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

test('every .mjs module in the kit parses', () => {
  const files = fs.readdirSync(SRC).filter((f) => f.endsWith('.mjs'));
  assert.ok(files.length > 10, `se esperaban varios modulos, hay ${files.length}`);
  const broken = files.filter((f) => spawnSync(process.execPath, ['--check', path.join(SRC, f)], { encoding: 'utf8' }).status !== 0);
  assert.deepEqual(broken, [], `modulos con error de sintaxis: ${broken.join(', ')}`);
});
