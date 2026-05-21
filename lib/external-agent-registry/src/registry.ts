import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import {
  ExternalAgentRegistrySchema,
  type ExternalAgentRegistryFile,
  type ExternalWorkerEntry,
  type ExternalWorkerId,
  type ResolvedExternalWorker,
} from './types.js';

const DEFAULT_RELATIVE_PATH = join('config', 'external-agent-registry.json');

let cached: ExternalAgentRegistryFile | null = null;
let cachedPath: string | null = null;

export function resolveRegistryPath(root?: string): string {
  if (process.env.OPSLY_EXTERNAL_AGENT_REGISTRY_PATH?.trim()) {
    return process.env.OPSLY_EXTERNAL_AGENT_REGISTRY_PATH.trim();
  }
  const base = root?.trim() || process.env.OPSLY_ROOT?.trim() || process.cwd();
  return join(base, DEFAULT_RELATIVE_PATH);
}

export async function loadExternalAgentRegistry(
  root?: string,
): Promise<ExternalAgentRegistryFile> {
  const path = resolveRegistryPath(root);
  if (cached && cachedPath === path) {
    return cached;
  }
  if (!existsSync(path)) {
    throw new Error(`external-agent-registry not found: ${path}`);
  }
  const raw = await readFile(path, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  const registry = ExternalAgentRegistrySchema.parse(parsed);
  cached = registry;
  cachedPath = path;
  return registry;
}

export function clearExternalAgentRegistryCache(): void {
  cached = null;
  cachedPath = null;
}

export function listEnabledWorkers(
  registry: ExternalAgentRegistryFile,
): Array<{ id: ExternalWorkerId; entry: ExternalWorkerEntry }> {
  return Object.entries(registry.workers)
    .filter(([, entry]) => entry.enabled)
    .map(([id, entry]) => ({ id, entry }));
}

export function getWorkerEntry(
  registry: ExternalAgentRegistryFile,
  workerId: string,
): ExternalWorkerEntry | null {
  const entry = registry.workers[workerId];
  if (!entry || !entry.enabled) {
    return null;
  }
  return entry;
}

export function resolveWorker(
  registry: ExternalAgentRegistryFile,
  workerId: string,
): ResolvedExternalWorker | null {
  const entry = getWorkerEntry(registry, workerId);
  if (!entry) {
    return null;
  }
  return {
    workerId,
    entry,
    opslyJobType: entry.opsly_job_type,
    defaultModel: entry.default_model,
    command: entry.command,
  };
}

export function resolveDefaultWorker(
  registry: ExternalAgentRegistryFile,
): ResolvedExternalWorker {
  const resolved = resolveWorker(registry, registry.default_worker_id);
  if (!resolved) {
    throw new Error(
      `default_worker_id "${registry.default_worker_id}" is missing or disabled`,
    );
  }
  return resolved;
}

/** Map opsly job type (local_*) or registry worker id to canonical worker id. */
export function workerIdFromOpslyJobType(
  registry: ExternalAgentRegistryFile,
  opslyJobType: string,
): ExternalWorkerId | null {
  const normalized = opslyJobType.trim().toLowerCase();
  for (const [id, entry] of Object.entries(registry.workers)) {
    if (entry.opsly_job_type.toLowerCase() === normalized) {
      return id;
    }
  }
  return null;
}

export function workerIdFromCommand(
  registry: ExternalAgentRegistryFile,
  command: string,
): ExternalWorkerId | null {
  const normalized = command.trim().toLowerCase();
  for (const [id, entry] of Object.entries(registry.workers)) {
    if (entry.command.toLowerCase() === normalized) {
      return id;
    }
  }
  return null;
}
