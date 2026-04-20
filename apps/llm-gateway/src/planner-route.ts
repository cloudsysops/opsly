import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { llmCall } from "./gateway.js";
import { GatewayHttpError } from "./llm-direct.js";
import type { LLMMessage, LLMRequest } from "./types.js";

/** Contrato alineado con apps/orchestrator (Remote Planner / Chat.z). */
export interface PlannerResponseShape {
  reasoning: string;
  actions: Array<{
    tool: string;
    params: Record<string, unknown>;
  }>;
}

export interface PlannerHttpRequestBody {
  tenant_slug: string;
  request_id?: string;
  tenant_plan?: "startup" | "business" | "enterprise";
  context: Record<string, unknown>;
  available_tools: string[];
}

/** Cuerpo tipo OpenAI chat/completions para el planner (Orchestrator → gateway). */
export interface ChatCompletionsPlannerBody {
  model?: string;
  tenant_slug: string;
  request_id?: string;
  tenant_plan?: "startup" | "business" | "enterprise";
  messages: Array<{ role: string; content: string }>;
  user_id?: string;
  feature?: string;
  usage_metadata?: Record<string, unknown>;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      chunks.push(c);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

function stripJsonFences(raw: string): string {
  const trimmed = raw.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(trimmed);
  if (fence?.[1]) {
    return fence[1].trim();
  }
  return trimmed;
}

function parsePlannerJson(content: string): PlannerResponseShape {
  const inner = stripJsonFences(content);
  const parsed: unknown = JSON.parse(inner);
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("reasoning" in parsed) ||
    !("actions" in parsed)
  ) {
    throw new Error("planner: invalid JSON shape");
  }
  const p = parsed as { reasoning: unknown; actions: unknown };
  if (typeof p.reasoning !== "string" || !Array.isArray(p.actions)) {
    throw new Error("planner: reasoning/actions types invalid");
  }
  const actions: PlannerResponseShape["actions"] = [];
  for (const a of p.actions) {
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
  return { reasoning: p.reasoning, actions };
}

const PLANNER_SYSTEM = `You are the Remote Planner (Chat.z) for OpslyQuantum OpenClaw.
Respond with ONLY valid JSON (no markdown), matching this exact shape:
{"reasoning":"string","actions":[{"tool":"string","params":{}}]}
Each action.tool must be one of the available_tools listed in the user message.
Use params as a flat object of arguments for that tool. If no action is needed, use an empty actions array.`;

function chatBodyToLlmRequest(body: ChatCompletionsPlannerBody, requestId: string): LLMRequest {
  const systemParts: string[] = [];
  const conv: LLMMessage[] = [];
  for (const m of body.messages) {
    if (m.role === "system") {
      systemParts.push(m.content);
    } else if (m.role === "user" || m.role === "assistant") {
      conv.push({ role: m.role, content: m.content });
    }
  }
  const system = systemParts.join("\n\n") || PLANNER_SYSTEM;
  const messages: LLMMessage[] =
    conv.length > 0
      ? conv
      : [{ role: "user", content: "(planner: no user/assistant messages in request)" }];
  return {
    tenant_slug: body.tenant_slug,
    request_id: requestId,
    tenant_plan: body.tenant_plan,
    messages,
    system,
    legacy_pipeline: true,
    routing_bias: "cost",
    max_tokens: 2048,
    temperature: 0.2,
    skip_repo_context: true,
    ...(body.user_id !== undefined && body.user_id.length > 0
      ? { user_id: body.user_id }
      : {}),
    ...(body.feature !== undefined && body.feature.length > 0
      ? { feature: body.feature }
      : {}),
    ...(body.usage_metadata !== undefined &&
    typeof body.usage_metadata === "object" &&
    !Array.isArray(body.usage_metadata) &&
    body.usage_metadata !== null &&
    Object.keys(body.usage_metadata).length > 0
      ? { usage_metadata: body.usage_metadata }
      : {}),
  };
}

async function sendPlannerJsonResponse(
  res: ServerResponse,
  llmReq: LLMRequest,
  requestId: string,
): Promise<void> {
  const llmRes = await llmCall(llmReq);
  const planner = parsePlannerJson(llmRes.content);
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      planner,
      llm: {
        model_used: llmRes.model_used,
        tokens_input: llmRes.tokens_input,
        tokens_output: llmRes.tokens_output,
        cost_usd: llmRes.cost_usd,
        latency_ms: llmRes.latency_ms,
        cache_hit: llmRes.cache_hit,
      },
      request_id: requestId,
    }),
  );
}

async function handleChatCompletionsPlanner(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  let bodyRaw: string;
  try {
    bodyRaw = await readBody(req);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "invalid body" }));
    return true;
  }

  let body: ChatCompletionsPlannerBody;
  try {
    body = JSON.parse(bodyRaw) as ChatCompletionsPlannerBody;
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "JSON parse error" }));
    return true;
  }

  if (
    typeof body.tenant_slug !== "string" ||
    body.tenant_slug.length === 0 ||
    !Array.isArray(body.messages) ||
    body.messages.length === 0
  ) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "tenant_slug and non-empty messages required" }));
    return true;
  }

  const requestId = body.request_id ?? randomUUID();
  const llmReq = chatBodyToLlmRequest(body, requestId);

  try {
    await sendPlannerJsonResponse(res, llmReq, requestId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status =
      err instanceof GatewayHttpError && Number.isInteger(err.statusCode)
        ? err.statusCode
        : 502;
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "planner_failed", message: msg }));
  }
  return true;
}

async function handleLegacyPlanner(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  let bodyRaw: string;
  try {
    bodyRaw = await readBody(req);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "invalid body" }));
    return true;
  }

  let body: PlannerHttpRequestBody;
  try {
    body = JSON.parse(bodyRaw) as PlannerHttpRequestBody;
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "JSON parse error" }));
    return true;
  }

  if (
    typeof body.tenant_slug !== "string" ||
    body.tenant_slug.length === 0 ||
    typeof body.context !== "object" ||
    body.context === null ||
    !Array.isArray(body.available_tools)
  ) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "tenant_slug, context, available_tools required" }));
    return true;
  }

  const requestId = body.request_id ?? randomUUID();
  const userContent = JSON.stringify(
    {
      context: body.context,
      available_tools: body.available_tools,
    },
    null,
    2,
  );

  const llmReq: LLMRequest = {
    tenant_slug: body.tenant_slug,
    request_id: requestId,
    tenant_plan: body.tenant_plan,
    messages: [{ role: "user", content: userContent }],
    system: PLANNER_SYSTEM,
    legacy_pipeline: true,
    routing_bias: "cost",
    max_tokens: 2048,
    temperature: 0.2,
    skip_repo_context: true,
  };

  try {
    await sendPlannerJsonResponse(res, llmReq, requestId);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status =
      err instanceof GatewayHttpError && Number.isInteger(err.statusCode)
        ? err.statusCode
        : 502;
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "planner_failed", message: msg }));
  }
  return true;
}

export async function handlePlannerHttp(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const pathOnly = req.url?.split("?")[0] ?? "/";
  if (req.method !== "POST") {
    return false;
  }
  if (pathOnly === "/v1/chat/completions") {
    return handleChatCompletionsPlanner(req, res);
  }
  if (pathOnly === "/v1/planner") {
    return handleLegacyPlanner(req, res);
  }
  return false;
}
