export type JobType = "cursor" | "n8n" | "notify" | "drive" | "backup" | "health";

/** Rol convencional para trazabilidad (no framework aparte). */
export type AgentRole = "planner" | "executor" | "tool" | "notifier";

export interface OrchestratorJob {
  type: JobType;
  payload: Record<string, unknown>;
  /** Identificador de tarea para trazabilidad; opcional. */
  taskId?: string;
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
  /** Metadatos adicionales para extensibilidad. */
  metadata?: Record<string, unknown>;
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
  taskId?: string;
  tenant_slug?: string;
  tenant_id?: string;
  initiated_by: OrchestratorJob["initiated_by"];
  plan?: OrchestratorJob["plan"];
  idempotency_key?: string;
  request_id?: string;
  cost_budget_usd?: number;
  agent_role?: AgentRole;
  metadata?: Record<string, unknown>;
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
    if (!job || typeof job !== "object") {
      return false;
    }
    const j = job as Partial<OrchestratorJob>;
    return (
      typeof j.type === "string" &&
      j.type.length > 0 &&
      typeof j.initiated_by === "string" &&
      ["claude", "discord", "cron", "system"].includes(j.initiated_by)
    );
  },

  /** Validate optional idempotency key format. */
  isValidIdempotencyKey: (key: unknown): boolean => {
    return (
      typeof key === "string" &&
      key.length > 0 &&
      key.length <= 256 &&
      /^[a-zA-Z0-9:_-]+$/.test(key)
    );
  },

  /** Validate plan if provided. */
  isValidPlan: (plan: unknown): plan is OrchestratorJob["plan"] => {
    return (
      typeof plan === "string" &&
      (plan === "startup" || plan === "business" || plan === "enterprise")
    );
  },
} as const;
