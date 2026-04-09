/**
 * Cliente HTTP al servicio llm-gateway (sin llamadas directas a Anthropic/OpenAI).
 * POST /v1/planner — Hermes vía gateway (usage_events en el proceso gateway).
 */

const DEFAULT_BASE = "http://127.0.0.1:3010";

function gatewayBaseUrl(): string {
  const raw = process.env.LLM_GATEWAY_URL ?? process.env.ORCHESTRATOR_LLM_GATEWAY_URL ?? DEFAULT_BASE;
  return raw.replace(/\/$/, "");
}

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

export async function callRemotePlanner(
  body: PlannerGatewayRequest,
  headers: { requestId: string; tenantSlug: string },
): Promise<PlannerGatewayResponseBody> {
  const url = `${gatewayBaseUrl()}/v1/planner`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-request-id": headers.requestId,
      "x-tenant-slug": headers.tenantSlug,
    },
    body: JSON.stringify({
      tenant_slug: body.tenant_slug,
      request_id: body.request_id ?? headers.requestId,
      tenant_plan: body.tenant_plan,
      context: body.context,
      available_tools: body.available_tools,
    }),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`llm-gateway planner HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  const parsed = JSON.parse(text) as PlannerGatewayResponseBody;
  if (!parsed.planner || typeof parsed.planner.reasoning !== "string") {
    throw new Error("llm-gateway planner: invalid response body");
  }
  return parsed;
}
