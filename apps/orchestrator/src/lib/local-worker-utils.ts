/**
 * Local Worker Utilities
 *
 * Helper functions for local agent workers:
 * - File waiting (poll with timeout)
 * - Response file reading
 * - Job ID extraction
 */

import { promises as fsp, watch as fsWatch } from 'fs';
import * as path from 'path';

import type { WorkerConcurrencyKey } from '../worker-concurrency.js';

/**
 * Wait for file with event-driven monitoring (replaces polling)
 * Uses fs.watch for efficient file system monitoring
 *
 * Returns: file content if found, null on timeout
 */
export async function waitForFile(
  filePath: string,
  timeoutMs: number = 60000
): Promise<string | null> {
  const startTime = Date.now();
  const dir = path.dirname(filePath);
  const filename = path.basename(filePath);

  return new Promise((resolve) => {
    let timeout: NodeJS.Timeout | null = null;
    let watcher: ReturnType<typeof fsWatch> | null = null;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      if (watcher) watcher.close();
    };

    const checkFile = async () => {
      try {
        const content = await fsp.readFile(filePath, 'utf-8');
        const elapsedMs = Date.now() - startTime;
        console.log(`[LocalWorkerUtils] File found after ${elapsedMs}ms: ${filePath}`);
        cleanup();
        resolve(content);
      } catch (err) {
        // File still doesn't exist, continue watching
      }
    };

    timeout = setTimeout(() => {
      cleanup();
      const elapsedMs = Date.now() - startTime;
      console.error(`[LocalWorkerUtils] Timeout waiting for file (${elapsedMs}ms): ${filePath}`);
      resolve(null);
    }, timeoutMs);

    try {
      watcher = fsWatch(dir, { persistent: false }, (eventType, changedFile) => {
        if (changedFile === filename) {
          checkFile();
        }
      });

      checkFile();
    } catch (err) {
      // Error watching file - still respect timeout instead of failing immediately
      console.error(
        `[LocalWorkerUtils] Error watching file: ${err instanceof Error ? err.message : String(err)}`
      );
      // Let timeout handle the resolution
    }
  });
}

/**
 * Read response file from .cursor/responses/
 *
 * Returns: file content and metadata
 */
export async function readResponseFile(
  jobId: string,
  responsesDir: string
): Promise<{
  content: string;
  filePath: string;
  metadata: Record<string, unknown>;
}> {
  const filePath = path.join(responsesDir, `response-${jobId}.md`);

  try {
    const content = await fsp.readFile(filePath, 'utf-8');

    // Extract metadata from YAML frontmatter if present
    const metadata = parseYamlFrontmatter(content);

    return {
      content,
      filePath,
      metadata,
    };
  } catch (err) {
    throw new Error(`Cannot read response file ${filePath}: ${String(err)}`);
  }
}

/**
 * Parse YAML frontmatter from file content
 *
 * Returns: key-value map of frontmatter fields
 */
function parseYamlFrontmatter(content: string): Record<string, unknown> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);

  if (!match) {
    return {};
  }

  const yaml = match[1];
  const metadata: Record<string, unknown> = {};

  // Simple YAML parser (handles basic key: value pairs)
  for (const line of yaml.split('\n')) {
    if (!line.trim()) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    let value: unknown = line.substring(colonIndex + 1).trim();

    // Remove quotes if present
    value = (value as string).replace(/^['"]|['"]$/g, '');

    // Try to parse as number
    if (!isNaN(Number(value)) && value !== '') {
      value = Number(value);
    }

    // Try to parse as boolean
    if (value === 'true') value = true;
    if (value === 'false') value = false;

    metadata[key] = value;
  }

  return metadata;
}

/**
 * Extract job ID from response file path
 *
 * Examples:
 * - response-job-123.md → job-123
 * - response-abc-xyz-123.md → abc-xyz-123
 */
export function extractJobIdFromPath(filePath: string): string {
  const filename = path.basename(filePath);

  // response-{job_id}.md → {job_id}
  const match = filename.match(/^response-(.+)\.md$/);
  return match ? match[1] : filename;
}

/**
 * Check if validation guard exists for job
 *
 * Returns: true if guard file exists
 */
export async function hasValidationGuard(jobId: string, validationDir: string): Promise<boolean> {
  try {
    const guardPath = path.join(validationDir, `${jobId}.guard`);
    await fsp.access(guardPath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for validation guard to be written
 *
 * Returns: guard content if written within timeout, null on timeout
 */
export async function waitForValidationGuard(
  jobId: string,
  validationDir: string,
  timeoutMs: number = 30000
): Promise<Record<string, unknown> | null> {
  const startTime = Date.now();
  const guardPath = path.join(validationDir, `${jobId}.guard`);
  const guardFilename = path.basename(guardPath);

  return new Promise((resolve) => {
    let timeout: NodeJS.Timeout | null = null;
    let watcher: ReturnType<typeof fsWatch> | null = null;

    const cleanup = () => {
      if (timeout) clearTimeout(timeout);
      if (watcher) watcher.close();
    };

    const checkGuard = async () => {
      try {
        const content = await fsp.readFile(guardPath, 'utf-8');
        cleanup();
        resolve(JSON.parse(content) as Record<string, unknown>);
      } catch (err) {
        // Guard not written yet
      }
    };

    timeout = setTimeout(() => {
      cleanup();
      const elapsedMs = Date.now() - startTime;
      console.error(
        `[LocalWorkerUtils] Timeout waiting for validation guard (${elapsedMs}ms): ${jobId}`
      );
      resolve(null);
    }, timeoutMs);

    try {
      watcher = fsWatch(validationDir, { persistent: false }, (eventType, changedFile) => {
        if (changedFile === guardFilename) {
          checkGuard();
        }
      });

      checkGuard();
    } catch (err) {
      // Error watching validation dir - still respect timeout instead of failing immediately
      console.error(
        `[LocalWorkerUtils] Error watching validation guard: ${err instanceof Error ? err.message : String(err)}`
      );
      // Let timeout handle the resolution
    }
  });
}

/**
 * Format file size for display
 *
 * Examples: 1.2KB, 45.3MB
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Get file modification time
 *
 * Returns: ISO timestamp string
 */
export async function getFileModTime(filePath: string): Promise<string> {
  try {
    const stats = await fsp.stat(filePath);
    return stats.mtime.toISOString();
  } catch (err) {
    throw new Error(`Cannot get modification time for ${filePath}: ${String(err)}`);
  }
}

/**
 * Cleanup old response files
 *
 * Deletes files older than specified days in responsesDir
 */
export async function cleanupOldResponses(
  responsesDir: string,
  daysOld: number = 7
): Promise<void> {
  try {
    const files = await fsp.readdir(responsesDir);
    const now = Date.now();
    const maxAge = daysOld * 24 * 60 * 60 * 1000;

    for (const file of files) {
      const filePath = path.join(responsesDir, file);
      const stats = await fsp.stat(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        await fsp.unlink(filePath);
        console.log(`[LocalWorkerUtils] Cleaned up old response: ${file}`);
      }
    }
  } catch (err) {
    console.error('[LocalWorkerUtils] Error during cleanup:', err);
  }
}

/**
 * Parse prompt file with YAML frontmatter and content
 *
 * Returns: { metadata, content }
 */
export function parsePromptFrontmatter(content: string): {
  metadata: Record<string, unknown>;
  content: string;
} {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    return {
      metadata: {},
      content: content,
    };
  }

  const yaml = match[1];
  const body = match[2];
  const metadata: Record<string, unknown> = {};

  // Simple YAML parser (handles basic key: value pairs)
  for (const line of yaml.split('\n')) {
    if (!line.trim()) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.substring(0, colonIndex).trim();
    let value: unknown = line.substring(colonIndex + 1).trim();

    // Remove quotes if present
    value = (value as string).replace(/^['"]|['"]$/g, '');

    metadata[key] = value;
  }

  return {
    metadata,
    content: body.trim(),
  };
}

/**
 * Vendor / binary label (external only). Canonical Opsly ids are `local_*`.
 */
export const OPSLY_LOCAL_AGENT_EXTERNAL_CLI: Record<LocalAgentKind, string> = {
  local_cursor: 'cursor',
  local_claude: 'claude',
  local_copilot: 'copilot',
  local_opencode: 'opencode',
  local_codex: 'codex',
  local_openai: 'openai',
  local_hermes: 'hermes',
  local_decepticon: 'decepticon',
  local_aider: 'aider',
  local_goose: 'goose',
  local_playwright: 'playwright',
};

/** Map CLI-style short names to canonical Opsly service ids (`local_*`). */
export const EXTERNAL_CLI_TO_OPSLY_LOCAL_AGENT: Readonly<Record<string, LocalAgentKind>> = {
  cursor: 'local_cursor',
  claude: 'local_claude',
  copilot: 'local_copilot',
  opencode: 'local_opencode',
  codex: 'local_codex',
  openai: 'local_openai',
  hermes: 'local_hermes',
  decepticon: 'local_decepticon',
  aider: 'local_aider',
  goose: 'local_goose',
  playwright: 'local_playwright',
};

/** Canonical Opsly id for a local HTTP bridge (BullMQ job name = this string). */
export type LocalAgentKind =
  | 'local_cursor'
  | 'local_claude'
  | 'local_copilot'
  | 'local_opencode'
  | 'local_codex'
  | 'local_openai'
  | 'local_hermes'
  | 'local_decepticon'
  | 'local_aider'
  | 'local_goose'
  | 'local_playwright';

export const LOCAL_AGENT_KINDS: readonly LocalAgentKind[] = [
  'local_cursor',
  'local_claude',
  'local_copilot',
  'local_opencode',
  'local_codex',
  'local_openai',
  'local_hermes',
  'local_decepticon',
  'local_aider',
  'local_goose',
  'local_playwright',
];

export function externalCliLabelForOpslyLocalAgent(kind: LocalAgentKind): string {
  return OPSLY_LOCAL_AGENT_EXTERNAL_CLI[kind];
}

export function localAgentKindToWorkerConcurrencyKey(kind: LocalAgentKind): WorkerConcurrencyKey {
  const map: Record<LocalAgentKind, WorkerConcurrencyKey> = {
    local_cursor: 'local-cursor',
    local_claude: 'local-claude',
    local_copilot: 'local-copilot',
    local_opencode: 'local-opencode',
    local_codex: 'local-codex',
    local_openai: 'local-openai',
    local_hermes: 'local-hermes',
    local_decepticon: 'local-decepticon',
    local_aider: 'local-aider',
    local_goose: 'local-goose',
    local_playwright: 'local-playwright',
  };
  return map[kind];
}

/**
 * Resolve user input / legacy keys to canonical Opsly local agent id (`local_*`).
 */
export function resolveToOpslyLocalAgentKind(input: string): LocalAgentKind {
  const k = input
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/_agent$/, '');
  if ((LOCAL_AGENT_KINDS as readonly string[]).includes(k)) {
    return k as LocalAgentKind;
  }
  const mapped = EXTERNAL_CLI_TO_OPSLY_LOCAL_AGENT[k];
  if (mapped) {
    return mapped;
  }
  const bare = k.startsWith('local_') ? k.slice('local_'.length) : k;
  const fromBare = EXTERNAL_CLI_TO_OPSLY_LOCAL_AGENT[bare];
  if (fromBare) {
    return fromBare;
  }
  return 'local_cursor';
}

export function isLocalAgentKind(kind: string): boolean {
  const k = kind
    .trim()
    .toLowerCase()
    .replace(/-/g, '_')
    .replace(/_agent$/, '');
  if ((LOCAL_AGENT_KINDS as readonly string[]).includes(k)) {
    return true;
  }
  if (EXTERNAL_CLI_TO_OPSLY_LOCAL_AGENT[k]) {
    return true;
  }
  const bare = k.startsWith('local_') ? k.slice('local_'.length) : k;
  return EXTERNAL_CLI_TO_OPSLY_LOCAL_AGENT[bare] !== undefined;
}

export function normalizeLocalAgentKind(kind: string): LocalAgentKind {
  return resolveToOpslyLocalAgentKind(kind);
}

/** BullMQ job `name` / `OrchestratorJob.type` for local HTTP bridges. */
export function jobTypeForLocalAgent(agent: string): string {
  return resolveToOpslyLocalAgentKind(agent);
}

export function agentForLocalJobType(jobType: string): LocalAgentKind {
  return resolveToOpslyLocalAgentKind(jobType);
}

/** True for keys that map to local HTTP bridges (excludes e.g. `llm_gateway`). */
export function isConfigurableLocalBridgeKey(name: string): boolean {
  const k = name.trim().toLowerCase().replace(/-/g, '_');
  if ((LOCAL_AGENT_KINDS as readonly string[]).includes(k)) {
    return true;
  }
  return EXTERNAL_CLI_TO_OPSLY_LOCAL_AGENT[k] !== undefined;
}
