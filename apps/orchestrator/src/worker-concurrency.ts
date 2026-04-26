import { parseOrchestratorRole } from './orchestrator-role.js';

export type WorkerConcurrencyKey =
  | 'cursor'
  | 'n8n'
  | 'notify'
  | 'drive'
  | 'backup'
  | 'budget'
  | 'ollama'
  | 'webhook'
  | 'webhooks-processing'
  | 'general-events'
  | 'agent-classifier';

const FULL_STACK_DEFAULTS: Record<WorkerConcurrencyKey, number> = {
  cursor: 3,
  n8n: 5,
  notify: 10,
  drive: 2,
  backup: 1,
  budget: 2,
  ollama: 2,
  webhook: 10,
  'webhooks-processing': 3,
  'general-events': 10,
  'agent-classifier': 2,
};

const DISTRIBUTED_WORKER_DEFAULTS: Record<WorkerConcurrencyKey, number> = {
  cursor: 1,
  n8n: 1,
  notify: 2,
  drive: 1,
  backup: 1,
  budget: 1,
  ollama: 1,
  webhook: 1,
  'webhooks-processing': 1,
  'general-events': 1,
  'agent-classifier': 1,
};

const ENV_NAMES: Record<WorkerConcurrencyKey, string> = {
  cursor: 'ORCHESTRATOR_CURSOR_CONCURRENCY',
  n8n: 'ORCHESTRATOR_N8N_CONCURRENCY',
  notify: 'ORCHESTRATOR_NOTIFY_CONCURRENCY',
  drive: 'ORCHESTRATOR_DRIVE_CONCURRENCY',
  backup: 'ORCHESTRATOR_BACKUP_CONCURRENCY',
  budget: 'ORCHESTRATOR_BUDGET_CONCURRENCY',
  ollama: 'ORCHESTRATOR_OLLAMA_CONCURRENCY',
  webhook: 'ORCHESTRATOR_WEBHOOK_CONCURRENCY',
  'webhooks-processing': 'ORCHESTRATOR_WEBHOOKS_PROCESSING_CONCURRENCY',
  'general-events': 'ORCHESTRATOR_GENERAL_EVENTS_CONCURRENCY',
  'agent-classifier': 'ORCHESTRATOR_AGENT_CLASSIFIER_CONCURRENCY',
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
