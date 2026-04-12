import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { llmCallDirect } from "./llm-direct.js";
import type { LLMRequest, TenantPlan } from "./types.js";

export type OllamaTaskType = "analyze" | "generate" | "review" | "summarize";

export interface TextCompletionBody {
  tenant_slug: string;
  tenant_plan?: TenantPlan;
  request_id?: string;
  task_type?: OllamaTaskType;
  prompt: string;
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

function prefixForTask(task: OllamaTaskType | undefined): string {
  switch (task) {
    case "analyze":
      return "Analyze the following and suggest improvements:\n\n";
    case "generate":
      return "Generate concise code or text for the following request:\n\n";
    case "review":
      return "Review the following for bugs and risks:\n\n";
    case "summarize":
      return "Summarize the following in one short paragraph:\n\n";
    default:
      return "";
  }
}

function isTaskType(v: unknown): v is OllamaTaskType | undefined {
  if (v === undefined) {
    return true;
  }
  return (
    v === "analyze" || v === "generate" || v === "review" || v === "summarize"
  );
}

/**
 * Completado de texto vía `llmCallDirect` (cadena cheap → Ollama local si está sano).
 * No parsea JSON de planner; uso interno orchestrator / demos.
 */
export async function handleTextCompletionHttp(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const pathOnly = req.url?.split("?")[0] ?? "/";
  if (req.method !== "POST" || pathOnly !== "/v1/text") {
    return false;
  }

  let bodyRaw: string;
  try {
    bodyRaw = await readBody(req);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "invalid body" }));
    return true;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyRaw) as unknown;
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "JSON parse error" }));
    return true;
  }

  if (typeof parsed !== "object" || parsed === null) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "invalid body shape" }));
    return true;
  }

  const body = parsed as Record<string, unknown>;
  const tenantSlug = body.tenant_slug;
  const prompt = body.prompt;
  if (typeof tenantSlug !== "string" || tenantSlug.length === 0) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "tenant_slug required" }));
    return true;
  }
  if (typeof prompt !== "string" || prompt.trim().length === 0) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "prompt required" }));
    return true;
  }
  const taskType = body.task_type;
  if (!isTaskType(taskType)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "invalid task_type" }));
    return true;
  }

  let tenantPlan: TenantPlan | undefined;
  const tp = body.tenant_plan;
  if (tp === "startup" || tp === "business" || tp === "enterprise") {
    tenantPlan = tp;
  }

  const requestId =
    typeof body.request_id === "string" && body.request_id.length > 0
      ? body.request_id
      : randomUUID();

  const userContent = `${prefixForTask(taskType)}${prompt.trim()}`;
  const llmReq: LLMRequest = {
    tenant_slug: tenantSlug,
    tenant_plan: tenantPlan,
    request_id: requestId,
    messages: [{ role: "user", content: userContent }],
    legacy_pipeline: true,
    model: "cheap",
    routing_bias: "cost",
    max_tokens: 1024,
    temperature: 0.2,
    skip_repo_context: true,
  };

  try {
    const out = await llmCallDirect(llmReq);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        content: out.content,
        llm: {
          model_used: out.model_used,
          tokens_input: out.tokens_input,
          tokens_output: out.tokens_output,
          cost_usd: out.cost_usd,
          latency_ms: out.latency_ms,
          cache_hit: out.cache_hit,
        },
        request_id: requestId,
      }),
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "text_completion_failed", message: msg }));
  }
  return true;
}
