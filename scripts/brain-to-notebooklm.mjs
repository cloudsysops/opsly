#!/usr/bin/env node
/**
 * Sincroniza la bóveda Obsidian (docs/brain/) a NotebookLM como fuentes.
 * Detección smart: solo sube archivos modificados desde el último push.
 * Requiere: NOTEBOOKLM_ENABLED=true, NOTEBOOKLM_NOTEBOOK_ID, Python + client.py
 */
import { readFileSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

import { executeNotebookLM } from '@intcloudsysops/notebooklm-agent';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const brainPath = join(root, 'docs', 'brain');
const syncMarkerFile = join(root, '.brain-notebooklm-sync-timestamp');

function getLastSyncTime() {
  try {
    return parseInt(readFileSync(syncMarkerFile, 'utf8').trim(), 10) || 0;
  } catch {
    return 0;
  }
}

function saveLastSyncTime(timestamp) {
  writeFileSync(syncMarkerFile, String(timestamp), 'utf8');
}

function getModifiedFiles() {
  try {
    const lastSync = getLastSyncTime();
    const now = Date.now();

    // Si primera sincronización (marker no existe), subir todo
    if (lastSync === 0) {
      console.log('📚 Primera sincronización: incluyendo todos los archivos del cerebro');
      return getAllBrainFiles();
    }

    // Usar git para detectar cambios desde último commit
    try {
      const lastSyncSec = Math.floor(lastSync / 1000);
      const output = execSync(
        `git log --since="${new Date(lastSync).toISOString()}" --name-only --pretty=format: -- ${brainPath}`,
        { cwd: root, encoding: 'utf8' }
      );
      const files = output
        .split('\n')
        .filter(l => l.trim() && l.endsWith('.md'))
        .map(l => l.trim());

      if (files.length > 0) {
        console.log(`📝 ${files.length} archivos modificados desde última sincronización`);
        return [...new Set(files)]; // Deduplicar
      }
    } catch (e) {
      console.warn('⚠️  Git diff falló, sincronizando todo', e.message);
      return getAllBrainFiles();
    }

    return [];
  } catch (e) {
    console.error('❌ Error detectando archivos modificados:', e.message);
    return getAllBrainFiles();
  }
}

function getAllBrainFiles() {
  const files = [];

  function walk(dir) {
    try {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const fullPath = join(dir, entry.name);
        const relPath = fullPath.replace(root + '/', '');

        if (entry.isDirectory()) {
          // Saltar directorios especiales
          if (!['.git', 'node_modules', '.obsidian', 'attachments', '.embeddings'].includes(entry.name)) {
            walk(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(relPath);
        }
      }
    } catch (e) {
      console.error(`Error leyendo ${dir}:`, e.message);
    }
  }

  walk(brainPath);
  return files;
}

async function uploadFile(filePath, notebook_id) {
  try {
    const content = readFileSync(join(root, filePath), 'utf8');

    // Extraer título del frontmatter o usar nombre de archivo
    let title = filePath.replace(/^docs\/brain\//, '').replace(/\.md$/, '');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const fm = frontmatterMatch[1];
      const titleMatch = fm.match(/^title:\s*(.+)$/m);
      if (titleMatch) {
        title = titleMatch[1].trim().replace(/^["']|["']$/g, '');
      }
    }

    const result = await executeNotebookLM({
      action: 'add_source',
      tenant_slug: process.env.NOTEBOOKLM_DEFAULT_TENANT_SLUG?.trim() || 'platform',
      notebook_id,
      source_type: 'text',
      title,
      text: content,
    });

    return result.success;
  } catch (e) {
    console.error(`  ❌ Error subiendo ${filePath}:`, e.message);
    return false;
  }
}

async function main() {
  const nb = process.env.NOTEBOOKLM_NOTEBOOK_ID?.trim();
  if (process.env.NOTEBOOKLM_ENABLED?.trim().toLowerCase() !== 'true' || !nb) {
    console.log('⏭️  Saltando: NOTEBOOKLM_ENABLED o NOTEBOOKLM_NOTEBOOK_ID no configurados');
    process.exit(0);
  }

  if (!existsSync(brainPath)) {
    console.log('⏭️  Saltando: docs/brain/ no existe');
    process.exit(0);
  }

  console.log('🧠 Sincronizando Obsidian Brain → NotebookLM');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const filesToSync = getModifiedFiles();

  if (filesToSync.length === 0) {
    console.log('✅ Sin cambios en docs/brain/');
    saveLastSyncTime(Date.now());
    process.exit(0);
  }

  console.log(`📤 Subiendo ${filesToSync.length} archivo(s)...\n`);

  let successful = 0;
  for (const file of filesToSync) {
    process.stdout.write(`  ${file.replace(/^docs\/brain\//, '')}... `);
    const ok = await uploadFile(file, nb);
    console.log(ok ? '✅' : '❌');
    if (ok) successful += 1;
  }

  console.log('');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Sincronizados ${successful}/${filesToSync.length} archivos`);
  console.log(`🔗 Notebook: ${nb}`);
  console.log('');

  // Guardar timestamp para próxima sincronización
  saveLastSyncTime(Date.now());

  if (successful < filesToSync.length) {
    process.exit(1);
  }
}

main().catch(e => {
  console.error('❌ Error fatal:', e.message);
  process.exit(1);
});
