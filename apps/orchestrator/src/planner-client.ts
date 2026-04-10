/**
 * Cliente HTTP al LLM Gateway para el Planner externo (Chat.z).
 * POST /v1/chat/completions — Hermes / metering en el proceso gateway (sin LLM directo aquí).
 */

import { setupLangSmithTracing } from "./agents/langsmith.js";
import type { PlannerResponse } from "./types.js";

const DEFAULT_BASE = "http://127.0.0.1:3010";

/** System prompt inyectado en el cuerpo tipo chat/completions (español, JSON estricto). */
export const REMOTE_PLANNER_SYSTEM_PROMPT =
  'Eres un orquestador experto. Devuelve SOLO JSON válido con el formato { "reasoning": string, "actions": [] } ' +
  'donde cada elemento de actions es { "tool": string, "params": object }. Sin markdown ni texto fuera del JSON.';

function gatewayBaseUrl(): string {
  const raw = process.env.LLM_GATEWAY_URL ?? process.env.ORCHESTRATOR_LLM_GATEWAY_URL ?? DEFAULT_BASE;
  return raw.replace(/\/$/, "");
}

export interface RemotePlannerLlmMetrics {
  model_used: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
  latency_ms: number;
  cache_hit: boolean;
}

export interface ExecuteRemotePlannerResult {
  planner: PlannerResponse;
  llm: RemotePlannerLlmMetrics;
  request_id: string;
}

export interface ExecuteRemotePlannerOptions {
  tenantSlug: string;
  requestId: string;
  tenantPlan?: "startup" | "business" | "enterprise";
}

function normalizeActions(raw: unknown): PlannerResponse["actions"] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const actions: PlannerResponse["actions"] = [];
  for (const a of raw) {
    if (typeof a !== "object" || a === null || !("tool" in a)) {
      continue;
    }
    const tool = (a as { tool: unknown }).tool;
    const params = (a as { params?: unknown }).params;
    if (typeof tool !== "string") {
      continue;
    }
    actions.push({
      tool,
      params:
        typeof params === "object" && params !== null && !Array.isArray(params)
          ? (params as Record<string, unknown>)
          : {},
    });
  }
  return actions;
}

/**
 * Delega el plan al gateway vía POST /v1/chat/completions (mensajes system + user con contexto y herramientas).
 */
export async function executeRemotePlanner(
  context: string,
  tools: string[],
  options: ExecuteRemotePlannerOptions,
): Promise<ExecuteRemotePlannerResult> {
  setupLangSmithTracing();
  const url = `${gatewayBaseUrl()}/v1/chat/completions`;
  const userContent = `${context}\n\n---\nHerramientas disponibles (nombres exactos): ${JSON.stringify(tools)}`;

  const body = {
    model: "opsly-remote-planner",
    tenant_slug: options.tenantSlug,
    request_id: options.requestId,
    tenant_plan: options.tenantPlan,
    messages: [
      { role: "system", content: REMOTE_PLANNER_SYSTEM_PROMPT },
      { role: "user", content: userContent },
    ],
  };

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-request-id": options.requestId,
        "x-tenant-slug": options.tenantSlug,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`remote planner: red — ${msg}`);
  }

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`llm-gateway /v1/chat/completions HTTP ${res.status}: ${text.slice(0, 500)}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("llm-gateway /v1/chat/completions: respuesta no es JSON");
  }

  if (typeof parsed !== "object" || parsed === null || !("planner" in parsed)) {
    throw new Error("llm-gateway /v1/chat/completions: cuerpo inválido (falta planner)");
  }

  const p = parsed as {
    planner?: { reasoning?: unknown; actions?: unknown };
    llm?: RemotePlannerLlmMetrics;
    request_id?: string;
  };

  if (!p.planner || typeof p.planner.reasoning !== "string") {
    throw new Error("llm-gateway /v1/chat/completions: planner.reasoning inválido");
  }

  const actions = normalizeActions(p.planner.actions);
  const llm: RemotePlannerLlmMetrics = p.llm ?? {
    model_used: "unknown",
    tokens_input: 0,
    tokens_output: 0,
    cost_usd: 0,
    latency_ms: 0,
    cache_hit: false,
  };

  return {
    planner: { reasoning: p.planner.reasoning, actions },
    llm,
    request_id: typeof p.request_id === "string" ? p.request_id : options.requestId,
  };
}
