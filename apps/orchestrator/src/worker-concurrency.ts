import { parseOrchestratorRole } from './orchestrator-role.js';

export type WorkerConcurrencyKey =
  | 'cursor'
  | 'n8n'
  | 'notify'
  | 'drive'
  | 'backup'
  | 'budget'
  | 'ollama'
  | 'sandbox'
  | 'jcode'
  | 'hive'
  | 'webhook'
  | 'webhooks-processing'
  | 'general-events'
  | 'agent-classifier'
  | 'evolution'
  | 'terminal'
  | 'local-cursor'
  | 'local-claude'
  | 'local-copilot'
  | 'local-opencode';

const FULL_STACK_DEFAULTS: Record<WorkerConcurrencyKey, number> = {
  cursor: 3,
  n8n: 5,
  notify: 10,
  drive: 2,
  backup: 1,
  budget: 2,
  ollama: 2,
  sandbox: 1,
  jcode: 1,
  hive: 1,
  webhook: 10,
  'webhooks-processing': 3,
  'general-events': 10,
  'agent-classifier': 2,
  evolution: 1,
  terminal: 2,
  'local-cursor': 2,
  'local-claude': 2,
  'local-copilot': 1,
  'local-opencode': 1,
};

const DISTRIBUTED_WORKER_DEFAULTS: Record<WorkerConcurrencyKey, number> = {
  cursor: 1,
  n8n: 1,
  notify: 2,
  drive: 1,
  backup: 1,
  budget: 1,
  ollama: 1,
  sandbox: 1,
  jcode: 1,
  hive: 1,
  webhook: 1,
  'webhooks-processing': 1,
  'general-events': 1,
  'agent-classifier': 1,
  evolution: 1,
  terminal: 1,
  'local-cursor': 1,
  'local-claude': 1,
  'local-copilot': 1,
  'local-opencode': 1,
};

const ENV_NAMES: Record<WorkerConcurrencyKey, string> = {
  cursor: 'ORCHESTRATOR_CURSOR_CONCURRENCY',
  n8n: 'ORCHESTRATOR_N8N_CONCURRENCY',
  notify: 'ORCHESTRATOR_NOTIFY_CONCURRENCY',
  drive: 'ORCHESTRATOR_DRIVE_CONCURRENCY',
  backup: 'ORCHESTRATOR_BACKUP_CONCURRENCY',
  budget: 'ORCHESTRATOR_BUDGET_CONCURRENCY',
  ollama: 'ORCHESTRATOR_OLLAMA_CONCURRENCY',
  sandbox: 'ORCHESTRATOR_SANDBOX_CONCURRENCY',
  jcode: 'ORCHESTRATOR_JCODE_CONCURRENCY',
  hive: 'ORCHESTRATOR_HIVE_CONCURRENCY',
  webhook: 'ORCHESTRATOR_WEBHOOK_CONCURRENCY',
  'webhooks-processing': 'ORCHESTRATOR_WEBHOOKS_PROCESSING_CONCURRENCY',
  'general-events': 'ORCHESTRATOR_GENERAL_EVENTS_CONCURRENCY',
  'agent-classifier': 'ORCHESTRATOR_AGENT_CLASSIFIER_CONCURRENCY',
  evolution: 'ORCHESTRATOR_EVOLUTION_CONCURRENCY',
  terminal: 'ORCHESTRATOR_TERMINAL_CONCURRENCY',
  'local-cursor': 'ORCHESTRATOR_LOCAL_CURSOR_CONCURRENCY',
  'local-claude': 'ORCHESTRATOR_LOCAL_CLAUDE_CONCURRENCY',
  'local-copilot': 'ORCHESTRATOR_LOCAL_COPILOT_CONCURRENCY',
  'local-opencode': 'ORCHESTRATOR_LOCAL_OPENCODE_CONCURRENCY',
};

function parsePositiveInt(raw: string | undefined): number | null {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function defaultConcurrencyFor(key: WorkerConcurrencyKey): number {
  return parseOrchestratorRole() === 'worker'
    ? DISTRIBUTED_WORKER_DEFAULTS[key]
    : FULL_STACK_DEFAULTS[key];
}

export function getWorkerConcurrency(key: WorkerConcurrencyKey): number {
  const envName = ENV_NAMES[key];
  const fromEnv = parsePositiveInt(process.env[envName]);
  return fromEnv ?? defaultConcurrencyFor(key);
}

export function getWorkerConcurrencyEnvName(key: WorkerConcurrencyKey): string {
  return ENV_NAMES[key];
}
