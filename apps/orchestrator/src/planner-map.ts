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
];

/** Mapea una acción del planner a un job BullMQ conocido (MCP se invoca desde workers/API, no aquí). */
export function plannerActionToOrchestratorJob(
  action: PlannerAction,
  req: Pick<IntentRequest, "tenant_slug" | "initiated_by" | "plan" | "tenant_id">,
  correlationId: string,
  batchIndex: number,
): OrchestratorJob {
  const { tool, params } = action;
  const idempotencyKey = `planner::${tool}::${batchIndex}`;
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
    default:
      return {
        type: "notify",
        payload: {
          title: "Planner (unmapped tool)",
          message: JSON.stringify({ tool, params }),
          type: "warning",
        },
        ...common,
      };
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
