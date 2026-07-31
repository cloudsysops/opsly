#!/usr/bin/env node
/**
 * Founder sales helper — print one-page SOW from commercial catalog (no Next needed).
 * Usage:
 *   node scripts/sales/print-commercial-sow.mjs --package hybrid-opsly --vertical swim-school
 *   npm run sales:sow -- --package basic-setup
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const catalog = JSON.parse(
  readFileSync(join(root, 'config/commercial-catalog.json'), 'utf8')
);

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx === -1) return null;
  return process.argv[idx + 1] ?? null;
}

function formatRange(range) {
  if (!range) return 'Custom';
  if (range.min === range.max) return `$${range.min}`;
  return `$${range.min} – $${range.max}`;
}

const packageId = arg('package') ?? 'hybrid-opsly';
const verticalId = arg('vertical');
const pkg = catalog.packages.find((p) => p.id === packageId);
if (!pkg) {
  console.error(`Unknown package: ${packageId}`);
  console.error('Available:', catalog.packages.map((p) => p.id).join(', '));
  process.exit(1);
}
const vertical = verticalId
  ? catalog.verticals.find((v) => v.id === verticalId)
  : null;
if (verticalId && !vertical) {
  console.error(`Unknown vertical: ${verticalId}`);
  process.exit(1);
}

const modules = pkg.module_ids
  .map((id) => catalog.modules.find((m) => m.id === id))
  .filter(Boolean);

const lines = [
  'ICSO / Opsly — SOW orientativo',
  `Paquete: ${pkg.name} (${pkg.name_es})`,
  vertical ? `Vertical: ${vertical.label}` : null,
  `Setup: ${formatRange(pkg.setup_range_usd)}`,
  `Ops mensual: ${formatRange(pkg.ops_monthly_usd)}${pkg.ops_monthly_usd ? '/mo' : ''}`,
  '',
  'Módulos incluidos:',
  ...modules.map((m) => `- ${m.label} (${m.label_es}): ${m.summary}`),
  '',
  'Incluye:',
  ...pkg.includes.map((i) => `- ${i}`),
  '',
  'No incluye:',
  ...pkg.excludes.map((i) => `- ${i}`),
  '',
  catalog.sales_pitch_es,
  '',
  catalog.disclaimer,
].filter((l) => l !== null);

console.log(lines.join('\n'));
