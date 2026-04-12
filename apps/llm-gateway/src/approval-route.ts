import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  approvalDecisionSchema,
  approvalGateRequestSchema,
  type ApprovalGateResponse,
} from "@intcloudsysops/types";
import { analyzeComplexity } from "./complexity.js";
import { llmCallDirect } from "./llm-direct.js";
import type { LLMRequest } from "./types.js";

const DEFAULT_GATES = {
  min_success_rate: 95,
  max_response_time_ms: 500,
  max_critical_errors: 0,
} as const;

const APPROVAL_SYSTEM = `You are the QA approval gate for Opsly platform sandbox/QA pipelines.
You must respond with ONLY valid JSON (no markdown fences), matching this exact shape:
{"status":"APPROVE"|"REJECT"|"NEEDS_INFO","confidence":number,"reasoning":"string","recommendations":string[]}
Rules:
- confidence is an integer from 0 to 100.
- Compare metrics against the quality gates; explain briefly in reasoning.
- recommendations: short actionable strings (can be empty array).`;

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

function buildUserPrompt(
  sandbox_run_id: string,
  metrics: {
    success_rate: number;
    avg_response_time_ms: number;
    critical_errors: number;
    test_coverage: string[];
  },
  gates: {
    min_success_rate: number;
    max_response_time_ms: number;
    max_critical_errors: number;
  },
): string {
  return [
    `sandbox_run_id: ${sandbox_run_id}`,
    "",
    "Metrics:",
    JSON.stringify(metrics, null, 2),
    "",
    "Quality gates (thresholds):",
    JSON.stringify(gates, null, 2),
    "",
    "Decide whether this run should proceed toward QA deployment.",
  ].join("\n");
}

export async function handleApprovalAnalyzeHttp(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const pathOnly = req.url?.split("?")[0] ?? "/";
  if (pathOnly !== "/v1/approval-analyze" || req.method !== "POST") {
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

  const requestCheck = approvalGateRequestSchema.safeParse(parsed);
  if (!requestCheck.success) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "validation_error",
        details: requestCheck.error.flatten(),
      }),
    );
    return true;
  }

  const { sandbox_run_id, metrics, quality_gates } = requestCheck.data;
  const gates = {
    ...DEFAULT_GATES,
    ...quality_gates,
  };

  const userPrompt = buildUserPrompt(sandbox_run_id, metrics, gates);
  const complexity = analyzeComplexity(userPrompt, {
    context_length: userPrompt.length,
  });

  const llmReq: LLMRequest = {
    tenant_slug: "platform",
    request_id: randomUUID(),
    model: "sonnet",
    messages: [{ role: "user", content: userPrompt }],
    system: APPROVAL_SYSTEM,
    legacy_pipeline: true,
    routing_bias: "quality",
    max_tokens: 500,
    temperature: 0,
    skip_repo_context: true,
  };

  try {
    const llmRes = await llmCallDirect(llmReq);
    const inner = stripJsonFences(llmRes.content);
    let jsonParsed: unknown;
    try {
      jsonParsed = JSON.parse(inner) as unknown;
    } catch {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "approval_invalid_json", message: "LLM did not return JSON" }));
      return true;
    }

    const decisionCheck = approvalDecisionSchema.safeParse(jsonParsed);
    if (!decisionCheck.success) {
      res.writeHead(502, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "approval_invalid_shape",
          details: decisionCheck.error.flatten(),
        }),
      );
      return true;
    }

    const payload: ApprovalGateResponse = {
      sandbox_run_id,
      result: decisionCheck.data,
      model_used: llmRes.model_used,
      complexity: `L${complexity.level}`,
      timestamp: new Date().toISOString(),
    };

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(payload));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "approval_analyze_failed", message: msg }));
  }
  return true;
}
