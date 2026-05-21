import type { ExternalAgentRegistryFile, ResolvedExternalWorker, RoutingIntent } from './types.js';
import { resolveDefaultWorker, resolveWorker } from './registry.js';

export interface RouteExternalWorkerInput {
  intent?: string;
  agentRole?: string;
  explicitWorkerId?: string;
  explicitOpslyJobType?: string;
}

function normalizeIntent(raw: string | undefined): RoutingIntent {
  const k = (raw ?? '').trim().toLowerCase().replace(/-/g, '_');
  if (k === 'architect' || k === 'architecture' || k === 'design') {
    return 'architecture';
  }
  if (k === 'plan' || k === 'planning' || k === 'planner') {
    return 'planning';
  }
  if (k === 'implement' || k === 'implementation' || k === 'executor' || k === 'execute') {
    return 'implementation';
  }
  if (k === 'debug' || k === 'debugging' || k === 'fix') {
    return 'debugging';
  }
  if (k === 'review' || k === 'auditor' || k === 'audit') {
    return 'review';
  }
  if (k === 'security' || k === 'security_review' || k === 'shield') {
    return 'security_review';
  }
  if (k === 'test' || k === 'tests' || k === 'qa' || k === 'e2e') {
    return 'tests';
  }
  if (k === 'assistant' || k === 'notifier' || k === 'tool') {
    return 'assistant';
  }
  return 'default';
}

function workerIdForIntent(
  registry: ExternalAgentRegistryFile,
  intent: RoutingIntent,
): string {
  const fromNotes = registry.routing_notes[intent];
  if (fromNotes && registry.workers[fromNotes]?.enabled) {
    return fromNotes;
  }
  return registry.default_worker_id;
}

/**
 * Select which external binary worker Opsly should invoke.
 * Never returns a synthetic Opsly-native agent — only registry entries.
 */
export function routeExternalWorker(
  registry: ExternalAgentRegistryFile,
  input: RouteExternalWorkerInput,
): ResolvedExternalWorker {
  if (input.explicitWorkerId?.trim()) {
    const byId = resolveWorker(registry, input.explicitWorkerId.trim());
    if (byId) {
      return byId;
    }
  }

  if (input.explicitOpslyJobType?.trim()) {
    const jobType = input.explicitOpslyJobType.trim().toLowerCase();
    for (const [id, entry] of Object.entries(registry.workers)) {
      if (entry.enabled && entry.opsly_job_type.toLowerCase() === jobType) {
        const resolved = resolveWorker(registry, id);
        if (resolved) {
          return resolved;
        }
      }
    }
  }

  const intent = normalizeIntent(input.intent ?? input.agentRole);
  const workerId = workerIdForIntent(registry, intent);
  const routed = resolveWorker(registry, workerId);
  if (routed) {
    return routed;
  }
  return resolveDefaultWorker(registry);
}
