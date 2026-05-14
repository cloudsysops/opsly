#!/usr/bin/env node
/**
 * Regenera docs/.obsidian/file-index.json con rutas relativas al vault (docs/).
 * Uso: node scripts/update-obsidian-file-index.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const VAULT = path.join(REPO_ROOT, 'docs');
const OUT = path.join(VAULT, '.obsidian', 'file-index.json');

const IGNORE_DIR = new Set([
  '.obsidian',
  'node_modules',
  '.git',
  'dist',
  '.next',
]);

function walkMarkdown(dir, base, acc) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (IGNORE_DIR.has(e.name)) continue;
      walkMarkdown(full, base, acc);
    } else if (e.isFile() && e.name.endsWith('.md')) {
      acc.push(path.relative(base, full).split(path.sep).join('/'));
    }
  }
}

function main() {
  if (!fs.existsSync(VAULT)) {
    console.error('Vault docs/ no encontrado');
    process.exit(1);
  }
  const files = [];
  walkMarkdown(VAULT, VAULT, files);
  files.sort((a, b) => a.localeCompare(b, 'en'));
  const payload = {
    lastIndexed: new Date().toISOString(),
    totalFiles: files.length,
    vaultRoot: 'docs',
    files,
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`[obsidian] Wrote ${OUT} (${files.length} markdown files)`);
}

main();
