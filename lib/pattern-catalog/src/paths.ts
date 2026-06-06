import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { PatternCatalogIndex } from './types.js';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

export function findRepoRoot(start = process.cwd()): string {
  let current = start;
  for (let i = 0; i < 10; i += 1) {
    const indexPath = path.join(current, 'config', 'patterns', 'index.json');
    if (existsSync(indexPath)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return path.resolve(MODULE_DIR, '../../..');
}

export function getPatternsRoot(repoRoot?: string): string {
  return path.join(repoRoot ?? findRepoRoot(), 'config', 'patterns');
}

export function loadPatternIndex(repoRoot?: string): PatternCatalogIndex {
  const root = repoRoot ?? findRepoRoot();
  const raw = readFileSync(path.join(root, 'config', 'patterns', 'index.json'), 'utf8');
  return JSON.parse(raw) as PatternCatalogIndex;
}

export function loadPatternFile<T>(relativePath: string, repoRoot?: string): T {
  const root = repoRoot ?? findRepoRoot();
  const full = path.join(getPatternsRoot(root), relativePath);
  const raw = readFileSync(full, 'utf8');
  return JSON.parse(raw) as T;
}

export function validatePatternIndex(repoRoot?: string): string[] {
  const root = repoRoot ?? findRepoRoot();
  const index = loadPatternIndex(root);
  const errors: string[] = [];
  const all = [
    ...index.harness.map((p) => ({ kind: 'harness', path: p })),
    ...index.tenant.map((p) => ({ kind: 'tenant', path: p })),
    ...index.opsly.map((p) => ({ kind: 'opsly', path: p })),
  ];
  for (const entry of all) {
    const full = path.join(getPatternsRoot(root), entry.path);
    if (!existsSync(full)) {
      errors.push(`missing ${entry.kind} pattern file: ${entry.path}`);
      continue;
    }
    try {
      const parsed = JSON.parse(readFileSync(full, 'utf8')) as { id?: string; kind?: string };
      if (!parsed.id || !parsed.kind) {
        errors.push(`${entry.path}: requires id and kind`);
      }
      if (parsed.kind !== entry.kind) {
        errors.push(`${entry.path}: kind mismatch (index=${entry.kind}, file=${parsed.kind})`);
      }
    } catch {
      errors.push(`${entry.path}: invalid JSON`);
    }
  }
  return errors;
}
