/**
 * Compatibilidad: delega en `executeRemotePlanner` (POST /v1/chat/completions).
 * Mantiene el contrato `PlannerGatewayRequest` usado por integraciones que armaban context + tools por separado.
 */

import { executeRemotePlanner } from "./planner-client.js";

export interface PlannerGatewayRequest {
  tenant_slug: string;
  request_id?: string;
  tenant_plan?: "startup" | "business" | "enterprise";
  context: Record<string, unknown>;
  available_tools: string[];
}

export interface PlannerGatewayResponseBody {
  planner: {
    reasoning: string;
    actions: Array<{ tool: string; params: Record<string, unknown> }>;
  };
  llm: {
    model_used: string;
    tokens_input: number;
    tokens_output: number;
    cost_usd: number;
    latency_ms: number;
    cache_hit: boolean;
  };
  request_id: string;
}

/** @deprecated Preferir `executeRemotePlanner` desde `planner-client.ts` (Chat.z / /v1/chat/completions). */
export async function callRemotePlanner(
  body: PlannerGatewayRequest,
  headers: { requestId: string; tenantSlug: string },
): Promise<PlannerGatewayResponseBody> {
  const contextPayload = JSON.stringify(
    {
      context: body.context,
      available_tools: body.available_tools,
    },
    null,
    2,
  );
  return executeRemotePlanner(contextPayload, body.available_tools, {
    tenantSlug: headers.tenantSlug,
    requestId: headers.requestId,
    tenantPlan: body.tenant_plan,
  });
}
