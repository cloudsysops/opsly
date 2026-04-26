import { readFile } from 'node:fs/promises';
import { basename, join } from 'node:path';

export interface KnowledgeFileEntry {
  path: string;
  title: string;
  keywords: string[];
  size_bytes: number;
}

export interface KnowledgeIndexFile {
  version: number;
  root: string;
  generated_at: string;
  /** Mapa invertido token → rutas (Repo-First RAG). */
  topics: Record<string, string[]>;
  /** Entradas enriquecidas (v1+) o legacy: solo rutas string. */
  files: KnowledgeFileEntry[] | string[];
}

let cachedIndex: KnowledgeIndexFile | null = null;
let cachedPath = '';

export function repoRoot(): string {
  return process.env.OPS_REPO_ROOT?.trim() || process.cwd();
}

export function knowledgeIndexPath(): string {
  return (
    process.env.KNOWLEDGE_INDEX_PATH?.trim() || join(repoRoot(), 'config', 'knowledge-index.json')
  );
}

function isRichFiles(files: KnowledgeIndexFile['files']): files is KnowledgeFileEntry[] {
  return files.length > 0 && typeof files[0] !== 'string';
}

/**
 * Lista normalizada de entradas (si el JSON es legacy, sintetiza título desde la ruta).
 */
export function normalizeFileEntries(index: KnowledgeIndexFile): KnowledgeFileEntry[] {
  if (!index.files || index.files.length === 0) {
    return [];
  }
  if (isRichFiles(index.files)) {
    return index.files;
  }
  return (index.files as string[]).map((path) => ({
    path,
    title: basename(path, '.md'),
    keywords: [],
    size_bytes: 0,
  }));
}

export async function loadKnowledgeIndex(): Promise<KnowledgeIndexFile | null> {
  const path = knowledgeIndexPath();
  if (cachedIndex && cachedPath === path) {
    return cachedIndex;
  }
  try {
    const raw = await readFile(path, 'utf8');
    const parsed = JSON.parse(raw) as KnowledgeIndexFile;
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    if (!parsed.topics || typeof parsed.topics !== 'object') {
      return null;
    }
    if (!Array.isArray(parsed.files)) {
      return null;
    }
    cachedIndex = parsed;
    cachedPath = path;
    return cachedIndex;
  } catch {
    return null;
  }
}

function tokenizeQuery(query: string): string[] {
  const lower = query.toLowerCase();
  const parts = lower.split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
  return [...new Set(parts)];
}

function scoreEntry(tokens: string[], entry: KnowledgeFileEntry): number {
  let s = 0;
  const pathLower = entry.path.toLowerCase();
  const titleLower = entry.title.toLowerCase();
  const kwSet = new Set(entry.keywords.map((k) => k.toLowerCase()));
  for (const tok of tokens) {
    if (kwSet.has(tok)) {
      s += 3;
    }
    if (titleLower.includes(tok)) {
      s += 2;
    }
    if (pathLower.includes(tok)) {
      s += 1;
    }
  }
  return s;
}

/**
 * Selecciona rutas relativas relevantes según tokens y el índice (topics + metadatos por archivo).
 */
export function selectPathsForQuery(index: KnowledgeIndexFile, query: string): string[] {
  const tokens = tokenizeQuery(query);
  const entries = normalizeFileEntries(index);

  if (entries.length > 0 && entries[0].keywords.length > 0) {
    const score = new Map<string, number>();
    for (const entry of entries) {
      const sc = scoreEntry(tokens, entry);
      if (sc > 0) {
        score.set(entry.path, (score.get(entry.path) ?? 0) + sc);
      }
    }
    if (score.size > 0) {
      return [...score.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([p]) => p)
        .slice(0, 16);
    }
  }

  const legacyScore = new Map<string, number>();
  for (const tok of tokens) {
    const paths = index.topics[tok];
    if (!paths) {
      continue;
    }
    for (const p of paths) {
      legacyScore.set(p, (legacyScore.get(p) ?? 0) + 1);
    }
  }

  const pathList = entries.map((e) => e.path);
  if (legacyScore.size === 0 && pathList.length > 0) {
    return pathList.slice(0, 8);
  }

  return [...legacyScore.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([p]) => p)
    .slice(0, 16);
}
