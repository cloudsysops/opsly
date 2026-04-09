export type JobType = "cursor" | "n8n" | "notify" | "drive";

/** Rol convencional para trazabilidad (no framework aparte). */
export type AgentRole = "planner" | "executor" | "tool" | "notifier";

export interface OrchestratorJob {
  type: JobType;
  payload: Record<string, unknown>;
  tenant_slug?: string;
  /** UUID tenant en Supabase cuando exista; opcional. */
  tenant_id?: string;
  initiated_by: "claude" | "discord" | "cron" | "system";
  plan?: "startup" | "business" | "enterprise";
  /** Dedup en BullMQ (`jobId`); estable por intent + sub-job. */
  idempotency_key?: string;
  /** Correlación HTTP / logs; se genera si no viene en el intent. */
  request_id?: string;
  /** Presupuesto simbólico USD para capas posteriores (cost tracking). */
  cost_budget_usd?: number;
  agent_role?: AgentRole;
}

export type Intent =
  | "execute_code"
  | "trigger_workflow"
  | "notify"
  | "sync_drive"
  | "full_pipeline"
  /** Delegación al LLM Gateway (Remote Planner / Chat.z); requiere tenant_slug y plan Hermes. */
  | "remote_plan";

export interface IntentRequest {
  intent: Intent;
  context: Record<string, unknown>;
  tenant_slug?: string;
  tenant_id?: string;
  initiated_by: OrchestratorJob["initiated_by"];
  plan?: OrchestratorJob["plan"];
  idempotency_key?: string;
  request_id?: string;
  cost_budget_usd?: number;
  agent_role?: AgentRole;
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
