/**
 * Cliente HTTP al servicio llm-gateway (sin llamadas directas a Anthropic/OpenAI).
 * POST /v1/planner — Hermes vía gateway (usage_events en el proceso gateway).
 */

import { z } from "zod";

const DEFAULT_BASE = "http://127.0.0.1:3010";
const PLANNER_TIMEOUT_MS = 30_000; // 30 segundos timeout

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

// 🟢 NEW: Zod schema for validation
const LLMMetricsSchema = z.object({
  model_used: z.string(),
  tokens_input: z.number().int().nonnegative(),
  tokens_output: z.number().int().nonnegative(),
  cost_usd: z.number().nonnegative(),
  latency_ms: z.number().nonnegative(),
  cache_hit: z.boolean(),
});

const PlannerActionSchema = z.object({
  tool: z.string(),
  params: z.record(z.unknown()),
});

const PlannerGatewayResponseSchema = z.object({
  planner: z.object({
    reasoning: z.string(),
    actions: z.array(PlannerActionSchema),
  }),
  llm: LLMMetricsSchema,
  request_id: z.string(),
});

export async function callRemotePlanner(
  body: PlannerGatewayRequest,
  headers: { requestId: string; tenantSlug: string },
): Promise<PlannerGatewayResponseBody> {
  const url = `${gatewayBaseUrl()}/v1/planner`;
  
  // 🟢 NEW: AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PLANNER_TIMEOUT_MS);

  try {
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
      signal: controller.signal, // ← Timeout abort signal
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`llm-gateway planner HTTP ${res.status}: ${text.slice(0, 500)}`);
    }

    // 🟢 NEW: Try-catch + Zod validation
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new Error(`llm-gateway planner: failed to parse JSON: ${String(err)}`);
    }

    // 🟢 NEW: Full schema validation (replaces partial checks)
    const validation = PlannerGatewayResponseSchema.safeParse(parsed);
    if (!validation.success) {
      throw new Error(
        `llm-gateway planner: invalid response schema: ${validation.error.message}`,
      );
    }

    return validation.data;
  } catch (err) {
    // Handle AbortError from timeout specifically
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `llm-gateway planner: request timeout after ${PLANNER_TIMEOUT_MS}ms`,
      );
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
