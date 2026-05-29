import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { routeToExternalBinary } from '../external-agent-coordinator.js';
import { resolveRepoRoot } from '@intcloudsysops/git-branch-orchestrator';

export type WorkerRoleIntent =
  | 'planning'
  | 'architecture'
  | 'implementation'
  | 'debugging'
  | 'review'
  | 'governance'
  | 'micro_completion'
  | 'orchestration';

export interface SelectWorkerInput {
  intent?: string;
  agentRole?: string;
  explicitAgent?: string;
  risk?: 'low' | 'medium' | 'high';
  writeRequired?: boolean;
}

export interface SelectWorkerResult {
  workerId: string;
  opslyJobType: string;
  service: string;
  rationale: string;
  needsApproval: boolean;
}

interface AgentCapabilityEntry {
  role?: string;
  service?: string;
  write_access?: boolean;
  risk_ceiling?: string;
  best_for?: string[];
}

interface AgentCapabilitiesFile {
  agents?: Record<string, AgentCapabilityEntry>;
  routing_policy?: { default_agent?: string };
}

let capabilitiesCache: AgentCapabilitiesFile | null = null;

async function loadCapabilities(): Promise<AgentCapabilitiesFile> {
  if (capabilitiesCache) {
    return capabilitiesCache;
  }
  const path = join(resolveRepoRoot(), 'config', 'agent-capabilities.json');
  const raw = await readFile(path, 'utf8');
  capabilitiesCache = JSON.parse(raw) as AgentCapabilitiesFile;
  return capabilitiesCache;
}

function mapIntentToRole(intent?: string, agentRole?: string): WorkerRoleIntent {
  const text = `${intent ?? ''} ${agentRole ?? ''}`.toLowerCase();
  if (text.includes('architect') || text.includes('plan')) {
    return 'architecture';
  }
  if (text.includes('review') || text.includes('audit') || text.includes('security')) {
    return 'review';
  }
  if (text.includes('govern') || text.includes('compliance')) {
    return 'governance';
  }
  if (text.includes('debug') || text.includes('fix')) {
    return 'debugging';
  }
  if (text.includes('complete') || text.includes('suggest')) {
    return 'micro_completion';
  }
  if (text.includes('implement') || text.includes('code') || text.includes('refactor')) {
    return 'implementation';
  }
  return 'orchestration';
}

function preferredAgentForRole(role: WorkerRoleIntent): string | undefined {
  switch (role) {
    case 'architecture':
    case 'planning':
      return 'claude';
    case 'implementation':
    case 'debugging':
      return 'codex';
    case 'review':
    case 'governance':
      return 'hermes';
    case 'micro_completion':
      return 'copilot';
    default:
      return undefined;
  }
}

export async function selectWorker(input: SelectWorkerInput): Promise<SelectWorkerResult> {
  const caps = await loadCapabilities();
  const role = mapIntentToRole(input.intent, input.agentRole);
  const preferred = input.explicitAgent?.trim() || preferredAgentForRole(role);
  const routed = await routeToExternalBinary({
    explicitOpslyJobType: preferred,
    agentRole: input.agentRole ?? role,
    intent: input.intent,
  });

  const capKey = routed.workerId;
  const cap = caps.agents?.[capKey];

  const risk = input.risk ?? 'medium';
  const needsApproval =
    risk === 'high' ||
    input.writeRequired === true ||
    (cap?.write_access === true && risk !== 'low');

  const rationaleParts = [
    `role=${role}`,
    `routed=${routed.workerId}`,
    cap?.best_for?.length ? `best_for=${cap.best_for.slice(0, 2).join(', ')}` : '',
  ].filter((p) => p.length > 0);

  return {
    workerId: routed.workerId,
    opslyJobType: routed.opslyJobType,
    service: capKey,
    rationale: rationaleParts.join('; '),
    needsApproval,
  };
}
