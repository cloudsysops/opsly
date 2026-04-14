import { Job, Worker } from "bullmq";
import { meterPlannerLlmFireAndForget } from "../metering/usage-events-meter.js";
import { logWorkerLifecycle } from "../observability/worker-log.js";
import type { OrchestratorJob } from "../types.js";
import { getWorkerConcurrency } from "../worker-concurrency.js";

const DEFAULT_GATEWAY = "http://127.0.0.1:3010";

function gatewayBaseUrl(): string {
  const raw =
    process.env.LLM_GATEWAY_URL ??
    process.env.ORCHESTRATOR_LLM_GATEWAY_URL ??
    DEFAULT_GATEWAY;
  return raw.replace(/\/$/, "");
}

type TextGatewayResponse = {
  content?: string;
  llm?: {
    model_used?: string;
    tokens_input?: number;
    tokens_output?: number;
    cost_usd?: number;
  };
};

export function startOllamaWorker(connection: object): Worker {
  const concurrency = getWorkerConcurrency("ollama");
  return new Worker(
    "openclaw",
    async (job: Job) => {
      if (job.name !== "ollama") {
        return;
      }
      const t0 = Date.now();
      logWorkerLifecycle("start", "ollama", job);
      const data = job.data as OrchestratorJob;
      const payload = data.payload as {
        task_type?: string;
        prompt?: string;
      };
      const prompt =
        typeof payload.prompt === "string" ? payload.prompt.trim() : "";
      if (prompt.length === 0) {
        logWorkerLifecycle("fail", "ollama", job, {
          duration_ms: Date.now() - t0,
          error: "empty prompt",
        });
        throw new Error("ollama job: prompt required");
      }
      const tenantSlug = data.tenant_slug?.trim() ?? "";
      if (tenantSlug.length === 0) {
        logWorkerLifecycle("fail", "ollama", job, {
          duration_ms: Date.now() - t0,
          error: "missing tenant_slug",
        });
        throw new Error("ollama job: tenant_slug required");
      }

      const taskType =
        payload.task_type === "analyze" ||
        payload.task_type === "generate" ||
        payload.task_type === "review" ||
        payload.task_type === "summarize"
          ? payload.task_type
          : "summarize";

      const url = `${gatewayBaseUrl()}/v1/text`;
      let res: Response;
      try {
        res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tenant_slug: tenantSlug,
            tenant_plan: data.plan,
            request_id: data.request_id,
            task_type: taskType,
            prompt,
          }),
          signal: AbortSignal.timeout(120_000),
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle("fail", "ollama", job, {
          duration_ms: Date.now() - t0,
          error: msg,
        });
        throw err;
      }

      if (!res.ok) {
        const errText = await res.text();
        logWorkerLifecycle("fail", "ollama", job, {
          duration_ms: Date.now() - t0,
          error: `gateway ${res.status}: ${errText.slice(0, 200)}`,
        });
        throw new Error(`ollama gateway HTTP ${res.status}`);
      }

      const json = (await res.json()) as TextGatewayResponse;
      const tokensIn = Math.max(0, json.llm?.tokens_input ?? 0);
      const tokensOut = Math.max(0, json.llm?.tokens_output ?? 0);
      meterPlannerLlmFireAndForget(tenantSlug, data.tenant_id, {
        model_used: json.llm?.model_used ?? "unknown",
        tokens_input: tokensIn,
        tokens_output: tokensOut,
      });

      logWorkerLifecycle("complete", "ollama", job, {
        duration_ms: Date.now() - t0,
      });

      return {
        success: true,
        content_preview:
          typeof json.content === "string"
            ? json.content.slice(0, 500)
            : "",
        cost_usd: json.llm?.cost_usd ?? 0,
        model_used: json.llm?.model_used ?? "unknown",
      };
    },
    { connection, concurrency },
  );
}
