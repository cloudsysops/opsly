import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { Job, Worker } from "bullmq";
import {
  approvalGateJobDataSchema,
  type ApprovalGateJobData,
  type ApprovalGateResponse,
} from "@intcloudsysops/types";
import { ApprovalGateClient } from "../lib/approval-gate-client.js";
import {
  formatApprovalMetricsEmbeddingText,
  isVertexEmbeddingConfigured,
  VertexAIClient,
  VERTEX_TEXT_EMBEDDING_004_DIM,
} from "../lib/vertex-ai-client.js";
import { logWorkerLifecycle } from "../observability/worker-log.js";

const DEFAULT_GATES = {
  min_success_rate: 95,
  max_response_time_ms: 500,
  max_critical_errors: 0,
} as const;

function getSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim() ?? "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (url.length === 0 || key.length === 0) {
    throw new Error("ApprovalGateWorker: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function notifyDiscordApproval(
  response: ApprovalGateResponse,
  deploymentId: string | undefined,
): Promise<void> {
  const webhook = process.env.DISCORD_WEBHOOK_URL?.trim() ?? "";
  if (webhook.length === 0) {
    return;
  }
  const { result } = response;
  const color = result.status === "APPROVE" ? 0x2ecc71 : result.status === "REJECT" ? 0xe74c3c : 0xf1c40f;
  const embed = {
    title: `Approval Gate: ${result.status}`,
    description: result.reasoning.slice(0, 2000),
    color,
    fields: [
      { name: "Confidence", value: `${String(result.confidence)}%`, inline: true },
      { name: "sandbox_run_id", value: response.sandbox_run_id, inline: true },
      {
        name: "deployment_id",
        value: deploymentId && deploymentId.length > 0 ? deploymentId : "—",
        inline: true,
      },
    ],
    timestamp: response.timestamp,
  };
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ embeds: [embed] }),
  });
  if (!res.ok) {
    console.warn("[ApprovalGate] Discord notify failed", res.status);
  }
}

export class ApprovalGateWorker {
  private readonly supabase: SupabaseClient;

  private readonly approvalClient: ApprovalGateClient;

  private readonly vertexClient: VertexAIClient | null;

  public constructor(
    supabase: SupabaseClient,
    approvalClient: ApprovalGateClient,
    vertexClient: VertexAIClient | null = null,
  ) {
    this.supabase = supabase;
    this.approvalClient = approvalClient;
    this.vertexClient = vertexClient;
  }

  public async execute(data: ApprovalGateJobData): Promise<ApprovalGateResponse> {
    const parsed = approvalGateJobDataSchema.safeParse(data);
    if (!parsed.success) {
      throw new Error(`ApprovalGateWorker: invalid job payload: ${parsed.error.message}`);
    }
    const job = parsed.data;
    console.log(`[ApprovalGate] Starting analysis: ${job.sandbox_run_id}`);

    const response = await this.approvalClient.analyze({
      sandbox_run_id: job.sandbox_run_id,
      metrics: job.metrics,
      quality_gates: DEFAULT_GATES,
    });

    const { error } = await this.supabase.schema("platform").from("approval_gate_decisions").insert({
      sandbox_run_id: job.sandbox_run_id,
      deployment_id: job.deployment_id ?? null,
      status: response.result.status,
      confidence: response.result.confidence,
      reasoning: response.result.reasoning,
      recommendations: response.result.recommendations,
      metrics: job.metrics as unknown as Record<string, unknown>,
      model_used: response.model_used,
      complexity: response.complexity,
    });

    if (error) {
      console.error("[ApprovalGate] Supabase insert failed", error);
      throw new Error(error.message);
    }

    if (this.vertexClient !== null) {
      try {
        const emb = await this.vertexClient.embedMetrics(job.metrics);
        const vectorLiteral = `[${emb.values.join(",")}]`;
        const modelUsed =
          process.env.VERTEX_AI_EMBEDDING_MODEL?.trim() || "text-embedding-004";
        const { error: embErr } = await this.supabase
          .schema("platform")
          .from("approval_gate_embeddings")
          .insert({
            sandbox_run_id: job.sandbox_run_id,
            metrics_embedding: vectorLiteral,
            metrics_text: formatApprovalMetricsEmbeddingText(job.metrics),
            model_used: modelUsed,
          });
        if (embErr) {
          console.warn("[ApprovalGate] embedding insert failed", embErr.message);
        } else {
          const dim = emb.dimension;
          console.log(`[ApprovalGate] Embedding stored: ${String(dim)} dims`);
          if (dim !== VERTEX_TEXT_EMBEDDING_004_DIM) {
            console.warn(
              `[ApprovalGate] expected ${String(VERTEX_TEXT_EMBEDDING_004_DIM)} dims, got ${String(dim)}`,
            );
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.warn("[ApprovalGate] Vertex embedding skipped:", msg);
      }
    }

    await notifyDiscordApproval(response, job.deployment_id);
    return response;
  }
}

export function startApprovalGateWorker(
  connection: object,
): { worker: Worker; closeSupabase: () => Promise<void> } {
  const supabase = getSupabase();
  const client = new ApprovalGateClient();
  let vertex: VertexAIClient | null = null;
  if (isVertexEmbeddingConfigured()) {
    try {
      vertex = new VertexAIClient();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn("[ApprovalGate] VERTEX_AI_EMBED_ENABLED but client init failed:", msg);
    }
  }
  const gate = new ApprovalGateWorker(supabase, client, vertex);

  const worker = new Worker<ApprovalGateJobData>(
    "approval-gate",
    async (job: Job<ApprovalGateJobData>) => {
      const t0 = Date.now();
      logWorkerLifecycle("start", "approval-gate", job);
      try {
        const out = await gate.execute(job.data);
        logWorkerLifecycle("complete", "approval-gate", job, { duration_ms: Date.now() - t0 });
        return out;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle("fail", "approval-gate", job, {
          duration_ms: Date.now() - t0,
          error: msg,
        });
        throw err;
      }
    },
    { connection, concurrency: 2 },
  );

  worker.on("failed", (job, err) => {
    console.error(`[ApprovalGate] Job failed: ${job?.id ?? "?"}`, err);
  });

  return {
    worker,
    closeSupabase: async () => {
      // Supabase JS client has no explicit close in v2
      await Promise.resolve();
    },
  };
}
