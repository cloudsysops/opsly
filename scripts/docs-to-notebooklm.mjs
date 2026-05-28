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
  'docs/00-architecture/ARCHITECTURE.md',
  'AGENTS.md',
  'docs/03-agents/AGENT-STARTUP-PROMPT.md',
  'docs/obsidian/TAXONOMY.md',
  'docs/obsidian/research/pattern-constellation.md',
  'docs/HERMES-INTEGRATION.md',
  'docs/NOTEBOOKLM-INTEGRATION.md',
  'docs/CODE-SNAPSHOTS.md',
  'docs/obsidian/research/agent-pattern-matrix.md',
  'docs/obsidian/sources/opsly-agent-pattern-sources.md',
  'docs/obsidian/research/saas-pattern-radar.md',
  'docs/obsidian/research/security-pattern-radar.md',
  'docs/obsidian/research/trading-pattern-radar.md',
  'docs/obsidian/sources/saas-pattern-sources.md',
  'docs/obsidian/sources/security-pattern-sources.md',
  'docs/obsidian/sources/trading-pattern-sources.md',
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
