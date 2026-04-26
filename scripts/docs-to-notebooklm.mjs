#!/usr/bin/env node
/**
 * Sube documentación al notebook NotebookLM vía add_source (texto).
 * Requiere: NOTEBOOKLM_ENABLED=true, NOTEBOOKLM_NOTEBOOK_ID, Python + notebooklm-py, credenciales Google.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { executeNotebookLM } from '@intcloudsysops/notebooklm-agent';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const DOCS = [
  'ARCHITECTURE.md',
  'AGENTS.md',
  'docs/HERMES-INTEGRATION.md',
  'docs/NOTEBOOKLM-INTEGRATION.md',
  'docs/CODE-SNAPSHOTS.md',
];

try {
  const adr = join(root, 'docs/adr');
  for (const f of readdirSync(adr)) {
    if (f.endsWith('.md')) {
      DOCS.push(`docs/adr/${f}`);
    }
  }
} catch {
  // sin carpeta adr en checkout parcial
}

async function main() {
  const nb = process.env.NOTEBOOKLM_NOTEBOOK_ID?.trim();
  if (process.env.NOTEBOOKLM_ENABLED?.trim().toLowerCase() !== 'true' || !nb) {
    process.stderr.write('Skip: NOTEBOOKLM_ENABLED o NOTEBOOKLM_NOTEBOOK_ID no configurados.\n');
    process.exit(0);
  }

  let n = 0;
  for (const rel of DOCS) {
    try {
      const text = readFileSync(join(root, rel), 'utf8');
      const r = await executeNotebookLM({
        action: 'add_source',
        tenant_slug: process.env.NOTEBOOKLM_DEFAULT_TENANT_SLUG?.trim() || 'platform',
        notebook_id: nb,
        source_type: 'text',
        title: rel,
        text,
      });
      if (!r.success) {
        process.stderr.write(`FAIL ${rel}: ${r.error ?? 'unknown'}\n`);
      } else {
        n += 1;
      }
    } catch (e) {
      process.stderr.write(`ERR ${rel}: ${e instanceof Error ? e.message : String(e)}\n`);
    }
  }

  process.stdout.write(
    `✅ Synced ${String(n)}/${String(DOCS.length)} docs to NotebookLM (text sources)\n`
  );
}

await main();
