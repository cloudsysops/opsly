import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  CONTEXT_CACHE_TTL_SECONDS,
  MAX_CONTEXT_CHARS,
  MAX_CONTEXT_FILES,
} from "./constants.js";
import { getCachedContext, setCachedContext } from "./context-cache.js";
import { loadKnowledgeIndex, repoRoot, selectPathsForQuery } from "./knowledge-index.js";

export interface BuildContextResult {
  context: string;
  cache_hit: boolean;
  sources: string[];
  digest: string;
}

function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

function escapeXmlAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/**
 * Construye contexto Repo-First: índice local + fs; caché Redis `opsly:ctx:{sha256(query)}`.
 */
export async function buildContextFromQuery(query: string): Promise<BuildContextResult> {
  const digest = sha256Hex(query.trim() || "(empty)");

  const cached = await getCachedContext(digest);
  if (cached !== null && cached.length > 0) {
    return {
      context: cached,
      cache_hit: true,
      sources: [],
      digest,
    };
  }

  const index = await loadKnowledgeIndex();
  const root = repoRoot();
  const sources: string[] = [];
  const fileChunks: string[] = [];

  if (!index) {
    const empty = "<context_bundle><!-- knowledge-index.json missing or invalid --></context_bundle>";
    await setCachedContext(digest, empty, CONTEXT_CACHE_TTL_SECONDS);
    return { context: empty, cache_hit: false, sources, digest };
  }

  let paths = selectPathsForQuery(index, query);
  paths = paths.slice(0, MAX_CONTEXT_FILES);

  let used = 0;
  for (const rel of paths) {
    if (used >= MAX_CONTEXT_CHARS) {
      break;
    }
    const abs = join(root, rel);
    let body: string;
    try {
      body = await readFile(abs, "utf8");
    } catch {
      continue;
    }
    sources.push(rel);
    const open = `<context_file source="${escapeXmlAttr(rel)}">`;
    const close = `</context_file>`;
    const inner = `${open}\n${body}\n${close}`;
    const room = MAX_CONTEXT_CHARS - used - 80;
    if (room <= 0) {
      break;
    }
    const piece = inner.length > room ? `${inner.slice(0, room)}\n<!-- truncated -->\n${close}` : inner;
    fileChunks.push(piece);
    used += piece.length;
  }

  let bundle = `<context_bundle digest="${digest}">\n${fileChunks.join("\n\n")}\n</context_bundle>`;
  if (bundle.length > MAX_CONTEXT_CHARS) {
    bundle = `${bundle.slice(0, MAX_CONTEXT_CHARS)}\n<!-- context_bundle truncated -->\n</context_bundle>`;
  }

  await setCachedContext(digest, bundle, CONTEXT_CACHE_TTL_SECONDS);

  return {
    context: bundle,
    cache_hit: false,
    sources,
    digest,
  };
}
