#!/usr/bin/env node
/**
 * Convierte system_state.json a markdown y lo sube a NotebookLM como fuente.
 * Ejecutar: node scripts/state-to-notebooklm.mjs
 */
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';

import { executeNotebookLM } from '@intcloudsysops/notebooklm-agent';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

async function convertStateToMarkdown(state) {
  const lines = ['# Estado del Sistema Opsly', ''];
  lines.push(`**Última actualización:** ${state.last_updated}`);
  lines.push(`**Fase:** ${state.phase}`);
  lines.push('');

  if (state.vps) {
    lines.push('## VPS');
    lines.push(`- **IP:** ${state.vps.ip}`);
    lines.push(`- **Tailscale:** ${state.vps.tailscale}`);
    lines.push(`- **Status:** ${state.vps.status}`);
    if (state.vps.services) {
      lines.push('### Servicios');
      for (const [svc, status] of Object.entries(state.vps.services)) {
        lines.push(`- ${svc}: ${status}`);
      }
    }
    if (state.vps.notes) {
      lines.push(`**Notas:** ${state.vps.notes}`);
    }
    lines.push('');
  }

  if (state.deploy_staging) {
    lines.push('## Deploy Staging');
    lines.push(`- **Status:** ${state.deploy_staging.status}`);
    lines.push(`- **API Health:** ${state.deploy_staging.api_health_url}`);
    if (state.deploy_staging.notes) {
      lines.push(`- **Notas:** ${state.deploy_staging.notes}`);
    }
    lines.push('');
  }

  if (state.doppler) {
    lines.push('## Doppler');
    lines.push(`- **Proyecto:** ${state.doppler.project}`);
    lines.push(`- **Config:** ${state.doppler.config}`);
    lines.push(`- **Status:** ${state.doppler.status}`);
    if (state.doppler.missing?.length) {
      lines.push(`- **Faltantes:** ${state.doppler.missing.join(', ')}`);
    }
    lines.push('');
  }

  if (state.tenants?.length) {
    lines.push('## Tenants Activos');
    for (const t of state.tenants) {
      lines.push(`- ${t.slug}: ${t.status}`);
    }
    lines.push('');
  }

  if (state.next_action) {
    lines.push('## Próxima Acción');
    lines.push(state.next_action);
    lines.push('');
  }

  if (state.knowledge_system?.notebooklm) {
    lines.push('## NotebookLM');
    lines.push(`- **Enabled:** ${state.knowledge_system.notebooklm.enabled}`);
    lines.push(`- **Notebook ID:** ${state.knowledge_system.notebooklm.notebook_id}`);
    lines.push(`- **Status:** ${state.knowledge_system.notebooklm.status}`);
    lines.push('');
  }

  return lines.join('\n');
}

async function main() {
  const nb = process.env.NOTEBOOKLM_NOTEBOOK_ID?.trim();
  if (process.env.NOTEBOOKLM_ENABLED?.trim().toLowerCase() !== 'true' || !nb) {
    process.stderr.write('Skip: NOTEBOOKLM_ENABLED o NOTEBOOKLM_NOTEBOOK_ID no configurados.\n');
    process.exit(0);
  }

  try {
    const statePath = join(root, 'context/system_state.json');
    const state = JSON.parse(readFileSync(statePath, 'utf8'));
    const markdown = await convertStateToMarkdown(state);

    const tempDir = mkdtempSync(join(tmpdir(), 'notebooklm-'));
    const tempFile = join(tempDir, 'system_state.md');
    writeFileSync(tempFile, markdown);

    const result = await executeNotebookLM({
      action: 'add_source',
      tenant_slug: process.env.NOTEBOOKLM_DEFAULT_TENANT_SLUG?.trim() || 'platform',
      notebook_id: nb,
      source_type: 'text',
      title: 'system_state.json',
      text: markdown,
    });

    rmSync(tempDir, { recursive: true, force: true });

    if (result.success) {
      process.stdout.write('✅ system_state.json synced to NotebookLM\n');
    } else {
      process.stderr.write(`FAIL: ${result.error ?? 'unknown'}\n`);
      process.exit(1);
    }
  } catch (e) {
    process.stderr.write(`ERR: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(1);
  }
}

await main();
