import { readFile } from "node:fs/promises";
import { join } from "node:path";

export interface KnowledgeIndexFile {
  version: number;
  root: string;
  generated_at: string;
  topics: Record<string, string[]>;
  files: string[];
}

let cachedIndex: KnowledgeIndexFile | null = null;
let cachedPath = "";

export function repoRoot(): string {
  return process.env.OPS_REPO_ROOT?.trim() || process.cwd();
}

export function knowledgeIndexPath(): string {
  return process.env.KNOWLEDGE_INDEX_PATH?.trim() || join(repoRoot(), "config", "knowledge-index.json");
}

export async function loadKnowledgeIndex(): Promise<KnowledgeIndexFile | null> {
  const path = knowledgeIndexPath();
  if (cachedIndex && cachedPath === path) {
    return cachedIndex;
  }
  try {
    const raw = await readFile(path, "utf8");
    const parsed = JSON.parse(raw) as KnowledgeIndexFile;
    if (typeof parsed !== "object" || parsed === null || !parsed.topics) {
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
  const parts = lower.split(/[^a-z0-9]+/).filter((t) => t.length >= 3);
  return [...new Set(parts)];
}

/**
 * Selecciona rutas relativas relevantes según tokens de la consulta y el índice topics.
 */
export function selectPathsForQuery(index: KnowledgeIndexFile, query: string): string[] {
  const tokens = tokenizeQuery(query);
  const score = new Map<string, number>();

  for (const tok of tokens) {
    const paths = index.topics[tok];
    if (!paths) {
      continue;
    }
    for (const p of paths) {
      score.set(p, (score.get(p) ?? 0) + 1);
    }
  }

  if (score.size === 0 && index.files.length > 0) {
    return index.files.slice(0, 8);
  }

  return [...score.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([p]) => p)
    .slice(0, 16);
}
