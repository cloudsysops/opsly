import { randomUUID } from 'node:crypto';
import { mkdir, readFile, readdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { redactSecrets } from './redact.js';
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
  const target = sessionFilePath(dir, parsed.sessionId);
  // Write-then-rename so a crash mid-write never leaves a truncated session file.
  const tmp = `${target}.${randomUUID()}.tmp`;
  await writeFile(tmp, JSON.stringify(parsed, null, 2), 'utf8');
  await rename(tmp, target);
}

const warnedCorrupt = new Set<string>();

export class CorruptSessionError extends Error {
  constructor(
    readonly sessionId: string,
    cause: unknown,
  ) {
    super(`Session file is corrupt: ${sessionId}`);
    this.name = 'CorruptSessionError';
    this.cause = cause;
  }
}

export async function loadSession(sessionId: string): Promise<RuntimeSessionMetadata | null> {
  const dir = await ensureStateDir();
  let raw: string;
  try {
    raw = await readFile(sessionFilePath(dir, sessionId), 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }
    throw err;
  }
  try {
    return RuntimeSessionMetadataSchema.parse(JSON.parse(raw) as unknown);
  } catch (err) {
    // Distinguish "missing" from "present but unreadable" so a damaged file is never
    // silently reported as a session that does not exist.
    throw new CorruptSessionError(sessionId, err);
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
  const corrupt: string[] = [];
  for (const file of files) {
    if (!file.endsWith('.json')) {
      continue;
    }
    const id = file.replace(/\.json$/, '');
    try {
      const meta = await loadSession(id);
      if (meta) {
        out.push(meta);
      }
    } catch (err) {
      if (!(err instanceof CorruptSessionError)) {
        throw err;
      }
      corrupt.push(id);
    }
  }
  for (const id of corrupt) {
    if (!warnedCorrupt.has(id)) {
      warnedCorrupt.add(id);
      console.warn(`[session-manager] skipping corrupt session file: ${id}`);
    }
  }
  return out.sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

export async function appendSessionLog(sessionId: string, line: string): Promise<void> {
  const dir = await ensureStateDir();
  const logsDir = path.join(dir, 'logs');
  await mkdir(logsDir, { recursive: true });
  const logPath = path.join(logsDir, `${sessionId}.log`);
  const redacted = redactSecrets(line);
  await writeFile(logPath, `${new Date().toISOString()} ${redacted}\n`, { flag: 'a', encoding: 'utf8' });
}
