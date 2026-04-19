/**
 * Ejecución síncrona y segura de herramientas para OAR (`POST /api/tools/execute`).
 * Lectura/escritura solo bajo la raíz del repo (validación anti path-traversal), listado ADRs, índice de contexto.
 */

import { existsSync } from 'node:fs';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { z } from 'zod';

import { TOOLS_EXECUTE_LIMITS } from './constants';

export const toolsExecuteBodySchema = z.object({
  tenant_slug: z.string().min(1),
  action: z.string().min(1),
  args: z.record(z.unknown()).default({}),
});

export type ToolsExecuteBody = z.infer<typeof toolsExecuteBodySchema>;

export type ToolsExecutePayload = {
  success: boolean;
  observation: string;
  data?: unknown;
  error?: string;
};

/** URIs estáticas si falta `config/knowledge-index.json`. */
const FALLBACK_CONTEXT_URIS: readonly { uri: string; relativePath: string }[] = [
  { uri: 'opsly://context/agents', relativePath: 'AGENTS.md' },
  { uri: 'opsly://context/vision', relativePath: 'VISION.md' },
  { uri: 'opsly://context/system-state', relativePath: 'context/system_state.json' },
];

export function resolveOpslyRepoRoot(): string {
  const fromEnv = process.env.OPSLY_REPO_ROOT?.trim() || process.env.OPS_REPO_ROOT?.trim() || '';
  if (fromEnv.length > 0) {
    return resolve(fromEnv);
  }
  let current = process.cwd();
  const maxHops = TOOLS_EXECUTE_LIMITS.REPO_ROOT_MAX_PARENT_HOPS;
  for (let i = 0; i < maxHops; i += 1) {
    if (existsSync(join(current, 'AGENTS.md'))) {
      return resolve(current);
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return resolve(process.cwd());
}

function isPathInsideRoot(repoRoot: string, candidate: string): boolean {
  const rootResolved = resolve(repoRoot);
  const resolved = resolve(candidate);
  const prefix = rootResolved.endsWith(sep) ? rootResolved : rootResolved + sep;
  return resolved.startsWith(prefix);
}

function safeResolvedPath(repoRoot: string, relativePath: string): string | null {
  const trimmed = relativePath.trim().replace(/^\/+/, '');
  if (trimmed.length === 0) {
    return null;
  }
  if (trimmed.includes('\0')) {
    return null;
  }
  const full = resolve(repoRoot, trimmed);
  if (!isPathInsideRoot(repoRoot, full)) {
    return null;
  }
  return full;
}

async function runFsRead(
  repoRoot: string,
  args: Record<string, unknown>
): Promise<ToolsExecutePayload> {
  const pathRaw = args.path;
  if (typeof pathRaw !== 'string' || pathRaw.trim().length === 0) {
    return {
      success: false,
      error: 'args.path must be a non-empty string',
      observation: 'Missing or invalid args.path for fs_read',
    };
  }
  const full = safeResolvedPath(repoRoot, pathRaw);
  if (full === null) {
    return {
      success: false,
      error: 'Access denied or file not found',
      observation: 'Path escapes repository root or is invalid',
    };
  }
  try {
    const content = await readFile(full, 'utf8');
    return {
      success: true,
      data: { path: relative(repoRoot, full), content },
      observation: 'File read successfully',
    };
  } catch {
    return {
      success: false,
      error: 'Access denied or file not found',
      observation: 'Could not read file',
    };
  }
}

async function runFsWrite(
  repoRoot: string,
  args: Record<string, unknown>
): Promise<ToolsExecutePayload> {
  const pathRaw = args.path;
  const contentRaw = args.content;
  if (typeof pathRaw !== 'string' || pathRaw.trim().length === 0) {
    return {
      success: false,
      error: 'args.path must be a non-empty string',
      observation: 'Missing or invalid args.path for fs_write',
    };
  }
  if (typeof contentRaw !== 'string') {
    return {
      success: false,
      error: 'args.content must be a string',
      observation: 'Missing or invalid args.content for fs_write',
    };
  }
  const full = safeResolvedPath(repoRoot, pathRaw);
  if (full === null) {
    return {
      success: false,
      error: 'Access denied or invalid path',
      observation: 'Path escapes repository root or is invalid',
    };
  }
  try {
    await mkdir(dirname(full), { recursive: true });
    await writeFile(full, contentRaw, 'utf8');
    return {
      success: true,
      data: { path: relative(repoRoot, full) },
      observation: 'File written successfully',
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      error: message,
      observation: message,
    };
  }
}

async function runListAdrs(repoRoot: string): Promise<ToolsExecutePayload> {
  const adrDir = join(repoRoot, 'docs', 'adr');
  try {
    const names = await readdir(adrDir);
    const files = names.filter((n) => n.endsWith('.md')).sort();
    return {
      success: true,
      data: { directory: 'docs/adr', files },
      observation: `Found ${String(files.length)} ADRs`,
    };
  } catch {
    return {
      success: false,
      error: 'Access denied or file not found',
      observation: 'Could not list docs/adr',
    };
  }
}

type KnowledgeIndexFile = { path: string; title?: string };

async function runListContextResources(repoRoot: string): Promise<ToolsExecutePayload> {
  const indexPath = join(repoRoot, 'config', 'knowledge-index.json');
  try {
    const raw = await readFile(indexPath, 'utf8');
    const parsed = JSON.parse(raw) as { files?: KnowledgeIndexFile[] };
    const files = Array.isArray(parsed.files) ? parsed.files : [];
    const slice = TOOLS_EXECUTE_LIMITS.KNOWLEDGE_INDEX_SLICE;
    const resources = files.slice(0, slice).map((f) => ({
      uri: `opsly://doc/${f.path}` as const,
      title: f.title ?? f.path,
      path: f.path,
    }));
    return {
      success: true,
      data: { resources, count: resources.length, source: 'knowledge-index.json' },
      observation: `Found ${String(resources.length)} indexed resources`,
    };
  } catch {
    const resources = FALLBACK_CONTEXT_URIS.filter((e) =>
      existsSync(join(repoRoot, e.relativePath))
    ).map((e) => ({ uri: e.uri, path: e.relativePath }));
    return {
      success: true,
      data: { resources, count: resources.length, source: 'fallback_static' },
      observation:
        resources.length > 0
          ? `knowledge-index.json unavailable; listed ${String(resources.length)} static URIs`
          : 'knowledge-index.json unavailable and no static context files found',
    };
  }
}

/**
 * Ejecuta una acción síncrona conocida. Acciones no implementadas devuelven `success: false`.
 */
export async function executeToolAction(
  action: string,
  args: Record<string, unknown>,
  repoRoot: string
): Promise<ToolsExecutePayload> {
  switch (action) {
    case 'fs_read':
    case 'fs_read_file':
      return runFsRead(repoRoot, args);
    case 'fs_write':
    case 'fs_write_file':
      return runFsWrite(repoRoot, args);
    case 'list_adrs':
      return runListAdrs(repoRoot);
    case 'list_context_resources':
      return runListContextResources(repoRoot);
    default:
      return {
        success: false,
        error: 'Tool not found',
        observation: `Tool ${action} is not implemented in API route`,
      };
  }
}
