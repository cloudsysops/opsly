export type JobType =
  | 'cursor'
  | 'n8n'
  | 'notify'
  | 'drive'
  | 'backup'
  | 'health'
  | 'ollama'
  | 'research'
  | 'evolution'
  | 'sandbox_execution'
  | 'jcode_execution'
  | 'local_cursor'
  | 'local_claude'
  | 'local_copilot'
  | 'local_opencode'
  | 'defense_audit'
  | 'hive_objective'
  /** Payload: `{ intent_request: IntentRequest }` — ejecuta `processIntent` (p. ej. `oar_react`) en worker. */
  | 'intent_dispatch'
  /** Payload: `{ role: 'dev-api' | 'dev-ui' | 'devops', task: string, max_steps: number, tenant_slug: string }` */
  | 'agent_farm'
  /** Payload: `{ agent_id, commands[], tenant_slug, timeout_seconds? }` */
  | 'terminal_task'
  /** CloudSysOps OpenClaw: mensaje canal ventas → LLM Gateway (cola `cloudsysops-agents`). */
  | 'cloudsysops_sales_message'
  /** CloudSysOps OpenClaw: cierre de servicio → informe vía LLM Gateway (cola `cloudsysops-agents`). */
  | 'cloudsysops_ops_complete'
  /** Validación npm (type-check / test / build) en `repo_root`; escribe `.cursor/responses/validation-*.json`. */
  | 'test_validation';

export interface TestValidationPayload {
  type: 'test_validation';
  repo_root: string;
  tenant_slug: string;
  request_id: string;
  correlation_id: string;
  attempt: number;
  steps?: Array<'type-check' | 'test' | 'build'>;
  npm_workspace?: string;
  source_prompt_path?: string;
}

export interface SandboxExecutionPayload {
  type: 'sandbox_execution';
  command: string;
  image?: string;
  timeout?: number;
  allowNetwork?: boolean;
  tenant_slug: string;
  request_id: string;
}

export interface TerminalTaskPayload {
  agent_id: string;
  commands: string[];
  tenant_slug: string;
  timeout_seconds?: number;
  cwd?: string;
}

/**
 * Rol convencional para trazabilidad (no framework aparte).
 * Incluye roles extendidos OpenClaw (`registry.ts`) usados en control layer y jobs.
 */
export type AgentRole =
  | 'planner'
  | 'executor'
  | 'tool'
  | 'notifier'
  | 'builder'
  | 'skeptic'
  | 'validator'
  | 'researcher'
  | 'architect';
export type AutonomyRiskLevel = 'low' | 'medium' | 'high';

export interface OrchestratorJob {
  type: JobType;
  payload: Record<string, unknown>;
  /** Identificador de tarea para trazabilidad; opcional. */
  taskId?: string;
  /** REQUIRED: Identificador del tenant para aislamiento y seguimiento (tenant-aware orchestration). */
  tenant_slug: string;
  /** UUID tenant en Supabase cuando exista; opcional. */
  tenant_id?: string;
  initiated_by: 'claude' | 'discord' | 'cron' | 'system';
  plan?: 'startup' | 'business' | 'enterprise';
  /** Dedup en BullMQ (`jobId`); estable por intent + sub-job. */
  idempotency_key?: string;
  /** Correlación HTTP / logs; se genera si no viene en el intent. */
  request_id?: string;
  /** Presupuesto simbólico USD para capas posteriores (cost tracking). */
  cost_budget_usd?: number;
  agent_role?: AgentRole;
  /** Metadatos adicionales para extensibilidad. */
  metadata?: Record<string, unknown>;
  /** Nivel de riesgo operacional para políticas de autonomía. */
  autonomy_risk?: AutonomyRiskLevel;
}

export type Intent =
  | 'execute_code'
  | 'trigger_workflow'
  | 'notify'
  | 'sync_drive'
  | 'full_pipeline'
  /** Delegación al LLM Gateway (Remote Planner / Chat.z); requiere tenant_slug y plan Hermes. */
  | 'remote_plan'
  /** Plan + sprint persistido en `platform.sprints`; ejecución en background. */
  | 'sprint_plan'
  /**
   * Opsly Agentic Runtime — estrategia ReAct vía LLM Gateway `/v1/text` + memoria en proceso.
   * Requiere `tenant_slug` y `context.prompt` o `context.query`.
   */
  | 'oar_react';

export interface IntentRequest {
  intent: Intent;
  context: Record<string, unknown>;
  taskId?: string;
  /** REQUIRED: Tenant identifier for request scoping and isolation. */
  tenant_slug: string;
  tenant_id?: string;
  initiated_by: OrchestratorJob['initiated_by'];
  plan?: OrchestratorJob['plan'];
  idempotency_key?: string;
  request_id?: string;
  cost_budget_usd?: number;
  agent_role?: AgentRole;
  metadata?: Record<string, unknown>;
  autonomy_risk?: AutonomyRiskLevel;
}

/** Params por acción devuelta por el Remote Planner (JSON vía LLM Gateway). Sin `any`. */
export interface PlannerAction {
  tool: string;
  params: Record<string, unknown>;
}

/** Respuesta estructurada del cerebro externo (LLM Gateway / planner). */
export interface PlannerResponse {
  reasoning: string;
  actions: PlannerAction[];
}

/**
 * Minimal validation schema for job payloads.
 * Extensible — no breaking changes for existing jobs.
 */
export const JOB_VALIDATION = {
  /** Required base fields for any job. */
  isValidJob: (job: unknown): job is OrchestratorJob => {
    if (!job || typeof job !== 'object') {
      return false;
    }
    const j = job as Partial<OrchestratorJob>;
    return (
      typeof j.type === 'string' &&
      j.type.length > 0 &&
      typeof j.initiated_by === 'string' &&
      ['claude', 'discord', 'cron', 'system'].includes(j.initiated_by)
    );
  },

  /** Validate optional idempotency key format. */
  isValidIdempotencyKey: (key: unknown): boolean => {
    return (
      typeof key === 'string' &&
      key.length > 0 &&
      key.length <= 256 &&
      /^[a-zA-Z0-9:_-]+$/.test(key)
    );
  },

  /** Validate plan if provided. */
  isValidPlan: (plan: unknown): plan is OrchestratorJob['plan'] => {
    return (
      typeof plan === 'string' &&
      (plan === 'startup' || plan === 'business' || plan === 'enterprise')
    );
  },
} as const;
