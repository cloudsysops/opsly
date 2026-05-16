/**
 * Opsly coordinates external market binaries only — no native duplicate agents.
 * @see config/external-agent-registry.json
 */
import {
  loadExternalAgentRegistry,
  routeExternalWorker,
  listEnabledWorkers,
  type ExternalAgentRegistryFile,
  type ResolvedExternalWorker,
  type RouteExternalWorkerInput,
} from '@intcloudsysops/external-agent-registry';

import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

import { normalizeLocalAgentKind, type LocalAgentKind } from './local-worker-utils.js';

let registryPromise: Promise<ExternalAgentRegistryFile> | null = null;

function findRepoRoot(start: string): string {
  let dir = start;
  for (let depth = 0; depth < 8; depth += 1) {
    if (existsSync(join(dir, 'config', 'external-agent-registry.json'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return start;
}

function opslyRoot(): string {
  const fromEnv = process.env.OPSLY_ROOT?.trim();
  if (fromEnv && existsSync(join(fromEnv, 'config', 'external-agent-registry.json'))) {
    return fromEnv;
  }
  return findRepoRoot(process.cwd());
}

export async function getExternalAgentRegistry(): Promise<ExternalAgentRegistryFile> {
  if (!registryPromise) {
    registryPromise = loadExternalAgentRegistry(opslyRoot());
  }
  return registryPromise;
}

export function clearExternalAgentCoordinatorCache(): void {
  registryPromise = null;
}

export async function routeToExternalBinary(
  input: RouteExternalWorkerInput,
): Promise<ResolvedExternalWorker> {
  const registry = await getExternalAgentRegistry();
  return routeExternalWorker(registry, input);
}

/** BullMQ job type (`local_*`) from registry routing when caller did not pin an agent. */
export async function resolveOpslyJobTypeForPrompt(input: {
  explicitAgent?: string;
  agentRole?: string;
  goal?: string;
  intent?: string;
}): Promise<{
  opslyJobType: LocalAgentKind;
  worker: ResolvedExternalWorker;
}> {
  const registry = await getExternalAgentRegistry();

  if (input.explicitAgent?.trim()) {
    const kind = normalizeLocalAgentKind(input.explicitAgent);
    const worker =
      listEnabledWorkers(registry).find((w) => w.entry.opsly_job_type === kind) ??
      null;
    if (worker) {
      return {
        opslyJobType: kind,
        worker: {
          workerId: worker.id,
          entry: worker.entry,
          opslyJobType: worker.entry.opsly_job_type,
          defaultModel: worker.entry.default_model,
          command: worker.entry.command,
        },
      };
    }
  }

  const worker = routeExternalWorker(registry, {
    intent: input.intent ?? input.goal,
    agentRole: input.agentRole,
    explicitOpslyJobType: input.explicitAgent
      ? normalizeLocalAgentKind(input.explicitAgent)
      : undefined,
  });

  return {
    opslyJobType: normalizeLocalAgentKind(worker.opslyJobType),
    worker,
  };
}

export async function listExternalAgentsForApi(): Promise<
  Array<{
    worker_id: string;
    opsly_job_type: string;
    command: string;
    default_model: string;
    adapter: string;
    capabilities: string[];
    bridge_port?: number;
  }>
> {
  const registry = await getExternalAgentRegistry();
  return listEnabledWorkers(registry).map(({ id, entry }) => ({
    worker_id: id,
    opsly_job_type: entry.opsly_job_type,
    command: entry.command,
    default_model: entry.default_model,
    adapter: entry.adapter,
    capabilities: entry.capabilities,
    bridge_port: entry.bridge_port,
  }));
}
