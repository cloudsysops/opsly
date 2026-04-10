import type { OrchestratorJob } from "./types.js";
import type { IntentRequest, PlannerAction } from "./types.js";

/**
 * Herramientas MCP expuestas al planner (lista para prompt; ejecución real vía jobs).
 * Incluye stubs operativos para health/restart.
 */
export const DEFAULT_PLANNER_TOOL_NAMES: string[] = [
  "get_health",
  "get_metrics",
  "get_tenants",
  "get_tenant",
  "execute_prompt",
  "send_invitation",
  "onboard_tenant",
  "suspend_tenant",
  "resume_tenant",
  "notebooklm",
  "check_service_health",
  "restart_container",
  "notify",
  "sync_drive",
];

/** Mapa legible: herramienta planner → cola BullMQ = tipo de job (`openclaw` queue) + rol. */
export const PLANNER_TOOL_MAP: Record<
  string,
  { job_type: OrchestratorJob["type"]; label: string }
> = {
  execute_prompt: { job_type: "cursor", label: "cursor_worker" },
  send_invitation: { job_type: "n8n", label: "n8n_webhook" },
  notify: { job_type: "notify", label: "notify_worker" },
  get_health: { job_type: "notify", label: "planner_stub_notify" },
  get_metrics: { job_type: "notify", label: "planner_stub_notify" },
  get_tenants: { job_type: "notify", label: "planner_stub_notify" },
  get_tenant: { job_type: "notify", label: "planner_stub_notify" },
  check_service_health: { job_type: "notify", label: "planner_stub_notify" },
  restart_container: { job_type: "notify", label: "planner_stub_notify" },
  onboard_tenant: { job_type: "n8n", label: "n8n_onboard" },
  suspend_tenant: { job_type: "n8n", label: "n8n_suspend" },
  resume_tenant: { job_type: "n8n", label: "n8n_resume" },
  notebooklm: { job_type: "drive", label: "drive_notebooklm" },
  sync_drive: { job_type: "drive", label: "drive_sync" },
};

const FORBIDDEN_PLANNER_PARAM_KEYS = new Set(["tenant_slug", "request_id", "tenant_id"]);

/** Zero-Trust: el planner no puede sobrescribir identidad del intent por params. */
export function sanitizePlannerParams(params: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (FORBIDDEN_PLANNER_PARAM_KEYS.has(k)) {
      continue;
    }
    out[k] = v;
  }
  return out;
}

export function isKnownPlannerTool(tool: string): boolean {
  return Object.prototype.hasOwnProperty.call(PLANNER_TOOL_MAP, tool);
}

/**
 * Mapea una acción del planner a un job BullMQ conocido.
 * @returns `null` si la herramienta no está registrada (fail-safe en engine).
 */
export function plannerActionToOrchestratorJob(
  action: PlannerAction,
  req: Pick<IntentRequest, "tenant_slug" | "initiated_by" | "plan" | "tenant_id">,
  correlationId: string,
  batchIndex: number,
): OrchestratorJob | null {
  const { tool } = action;
  const params = sanitizePlannerParams(action.params);

  if (!isKnownPlannerTool(tool)) {
    return null;
  }

  const idempotencyKey = `${correlationId}::planner::${tool}::${batchIndex}`;

  const common: Pick<
    OrchestratorJob,
    | "tenant_slug"
    | "tenant_id"
    | "plan"
    | "request_id"
    | "initiated_by"
    | "agent_role"
    | "idempotency_key"
  > = {
    tenant_slug: req.tenant_slug,
    tenant_id: req.tenant_id,
    plan: req.plan,
    request_id: correlationId,
    initiated_by: req.initiated_by,
    agent_role: "executor",
    idempotency_key: idempotencyKey,
  };

  switch (tool) {
    case "execute_prompt":
      return {
        type: "cursor",
        payload: { ...params, planner_tool: tool },
        ...common,
      };
    case "send_invitation":
    case "onboard_tenant":
    case "suspend_tenant":
    case "resume_tenant":
      return {
        type: "n8n",
        payload: { ...params, planner_tool: tool },
        ...common,
      };
    case "notify":
      return {
        type: "notify",
        payload: { ...params, planner_tool: tool },
        ...common,
      };
    case "get_health":
    case "get_metrics":
    case "get_tenants":
    case "get_tenant":
    case "check_service_health":
    case "restart_container":
      return {
        type: "notify",
        payload: {
          title: "Planner action",
          message: JSON.stringify({ tool, params }),
          type: "info",
          planner_tool: tool,
        },
        ...common,
      };
    case "sync_drive":
    case "notebooklm":
      return {
        type: "drive",
        payload: { ...params, planner_tool: tool },
        ...common,
      };
    default: {
      throw new Error(
        `plannerActionToOrchestratorJob: unknown tool "${tool}" - available: ${DEFAULT_PLANNER_TOOL_NAMES.join(", ")}`,
      );
    }
  }
}

export function buildPlannerContextSnapshot(req: IntentRequest): Record<string, unknown> {
  return {
    intent: req.intent,
    original_context: req.context,
    tenant_slug: req.tenant_slug ?? null,
    plan: req.plan ?? null,
    timestamp: new Date().toISOString(),
  };
}
