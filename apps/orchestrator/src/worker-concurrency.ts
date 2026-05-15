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
  | 'runtime_session'
  | 'local-cursor'
  | 'local-claude'
  | 'local-copilot'
  | 'local-opencode'
  | 'local-codex'
  | 'local-openai'
  | 'local-hermes'
  | 'local-decepticon'
  | 'local-aider'
  | 'local-goose'
  | 'local-playwright'
  | 'cloudsysops_agents'
  | 'defense_audit'
  | 'openclaw-planner'
  | 'openclaw-skeptic'
  | 'api_factory'
  | 'autonomous_revenue'
  | 'research'
  | 'agent_farm'
  | 'super_orchestrator'
  | 'approval-gate';

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
  runtime_session: 1,
  'local-cursor': 2,
  'local-claude': 2,
  'local-copilot': 1,
  'local-opencode': 1,
  'local-codex': 1,
  'local-openai': 1,
  'local-hermes': 1,
  'local-decepticon': 1,
  'local-aider': 1,
  'local-goose': 1,
  'local-playwright': 1,
  'cloudsysops_agents': 2,
  'defense_audit': 2,
  'openclaw-planner': 2,
  'openclaw-skeptic': 1,
  api_factory: 3,
  autonomous_revenue: 2,
  research: 2,
  agent_farm: 2,
  super_orchestrator: 3,
  'approval-gate': 2,
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
  runtime_session: 1,
  'local-cursor': 1,
  'local-claude': 1,
  'local-copilot': 1,
  'local-opencode': 1,
  'local-codex': 1,
  'local-openai': 1,
  'local-hermes': 1,
  'local-decepticon': 1,
  'local-aider': 1,
  'local-goose': 1,
  'local-playwright': 1,
  'cloudsysops_agents': 1,
  'defense_audit': 1,
  'openclaw-planner': 1,
  'openclaw-skeptic': 1,
  api_factory: 1,
  autonomous_revenue: 1,
  research: 1,
  agent_farm: 1,
  super_orchestrator: 1,
  'approval-gate': 1,
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
  runtime_session: 'ORCHESTRATOR_RUNTIME_SESSION_CONCURRENCY',
  'local-cursor': 'ORCHESTRATOR_LOCAL_CURSOR_CONCURRENCY',
  'local-claude': 'ORCHESTRATOR_LOCAL_CLAUDE_CONCURRENCY',
  'local-copilot': 'ORCHESTRATOR_LOCAL_COPILOT_CONCURRENCY',
  'local-opencode': 'ORCHESTRATOR_LOCAL_OPENCODE_CONCURRENCY',
  'local-codex': 'ORCHESTRATOR_LOCAL_CODEX_CONCURRENCY',
  'local-openai': 'ORCHESTRATOR_LOCAL_OPENAI_CONCURRENCY',
  'local-hermes': 'ORCHESTRATOR_LOCAL_HERMES_CONCURRENCY',
  'local-decepticon': 'ORCHESTRATOR_LOCAL_DECEPTICON_CONCURRENCY',
  'local-aider': 'ORCHESTRATOR_LOCAL_AIDER_CONCURRENCY',
  'local-goose': 'ORCHESTRATOR_LOCAL_GOOSE_CONCURRENCY',
  'local-playwright': 'ORCHESTRATOR_LOCAL_PLAYWRIGHT_CONCURRENCY',
  'cloudsysops_agents': 'ORCHESTRATOR_CLOUDSYSOPS_AGENTS_CONCURRENCY',
  'defense_audit': 'ORCHESTRATOR_DEFENSE_AUDIT_CONCURRENCY',
  'openclaw-planner': 'ORCHESTRATOR_OPENCLAW_PLANNER_CONCURRENCY',
  'openclaw-skeptic': 'ORCHESTRATOR_OPENCLAW_SKEPTIC_CONCURRENCY',
  api_factory: 'ORCHESTRATOR_API_FACTORY_CONCURRENCY',
  autonomous_revenue: 'ORCHESTRATOR_AUTONOMOUS_REVENUE_CONCURRENCY',
  research: 'ORCHESTRATOR_RESEARCH_CONCURRENCY',
  agent_farm: 'ORCHESTRATOR_AGENT_FARM_CONCURRENCY',
  super_orchestrator: 'ORCHESTRATOR_SUPER_ORCHESTRATOR_CONCURRENCY',
  'approval-gate': 'ORCHESTRATOR_APPROVAL_GATE_CONCURRENCY',
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
