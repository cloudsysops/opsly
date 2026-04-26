import type { KnowledgeFileEntry, KnowledgeIndexFile } from './knowledge-index.js';
import { loadKnowledgeIndex, normalizeFileEntries } from './knowledge-index.js';

/**
 * Carga el índice de conocimiento desde `KNOWLEDGE_INDEX_PATH` (o `config/knowledge-index.json` bajo `OPS_REPO_ROOT`).
 */
export async function loadIndex(): Promise<KnowledgeIndexFile | null> {
  return loadKnowledgeIndex();
}

function tokenize(q: string): string[] {
  const lower = q.toLowerCase();
  return [...new Set(lower.split(/[^a-z0-9]+/).filter((t) => t.length >= 2))];
}

function matchesQuery(entry: KnowledgeFileEntry, tokens: string[]): boolean {
  if (tokens.length === 0) {
    return true;
  }
  const hay = `${entry.title} ${entry.keywords.join(' ')} ${entry.path}`.toLowerCase();
  return tokens.some((t) => hay.includes(t));
}

/**
 * Filtra entradas del índice por título, keywords o ruta (consulta simple tipo “wikilink”).
 */
export function searchInIndex(index: KnowledgeIndexFile, query: string): KnowledgeFileEntry[] {
  const tokens = tokenize(query.trim());
  const entries = normalizeFileEntries(index);
  return entries.filter((e) => matchesQuery(e, tokens));
}

/**
 * Carga el índice y devuelve las entradas que coinciden con la consulta.
 */
export async function search(query: string): Promise<KnowledgeFileEntry[]> {
  const index = await loadIndex();
  if (!index) {
    return [];
  }
  return searchInIndex(index, query);
}
