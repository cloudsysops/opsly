import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import {
  type RuntimeSessionMetadata,
  RuntimeSessionMetadataSchema,
} from './types.js';

export function resolveStateDir(): string {
  const fromEnv = process.env.OPSLY_RUNTIME_STATE_DIR?.trim();
  if (fromEnv && fromEnv.length > 0) {
    return path.resolve(fromEnv);
  }
  const root = process.env.OPSLY_ROOT?.trim() || process.cwd();
  return path.join(root, 'runtime', 'sessions');
}

async function ensureStateDir(): Promise<string> {
  const dir = resolveStateDir();
  await mkdir(dir, { recursive: true });
  return dir;
}

function sessionFilePath(dir: string, sessionId: string): string {
  return path.join(dir, `${sessionId}.json`);
}

export async function saveSession(meta: RuntimeSessionMetadata): Promise<void> {
  const dir = await ensureStateDir();
  const parsed = RuntimeSessionMetadataSchema.parse(meta);
  await writeFile(sessionFilePath(dir, parsed.sessionId), JSON.stringify(parsed, null, 2), 'utf8');
}

export async function loadSession(sessionId: string): Promise<RuntimeSessionMetadata | null> {
  const dir = await ensureStateDir();
  try {
    const raw = await readFile(sessionFilePath(dir, sessionId), 'utf8');
    return RuntimeSessionMetadataSchema.parse(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export async function listStoredSessions(): Promise<RuntimeSessionMetadata[]> {
  const dir = await ensureStateDir();
  let files: string[] = [];
  try {
    files = await readdir(dir);
  } catch {
    return [];
  }
  const out: RuntimeSessionMetadata[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue;
    }
    const id = file.replace(/\.json$/, '');
    const meta = await loadSession(id);
    if (meta) {
      out.push(meta);
    }
  }
  return out.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export async function appendSessionLog(sessionId: string, line: string): Promise<void> {
  const dir = await ensureStateDir();
  const logsDir = path.join(dir, 'logs');
  await mkdir(logsDir, { recursive: true });
  const logPath = path.join(logsDir, `${sessionId}.log`);
  const redacted = line.replace(/(Bearer|token|password|secret)=[^\s]+/gi, '$1=***');
  await writeFile(logPath, `${new Date().toISOString()} ${redacted}\n`, { flag: 'a', encoding: 'utf8' });
}
