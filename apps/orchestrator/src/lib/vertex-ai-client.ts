import type {
  ApprovalMetrics,
  EmbeddingResponse,
  VertexEmbeddingResponse,
} from "@intcloudsysops/types";
import { JWT } from "google-auth-library";

/** text-embedding-004 (Vertex) — dimensión fija en la API actual. */
export const VERTEX_TEXT_EMBEDDING_004_DIM = 768;

const PREDICT_SCOPE = "https://www.googleapis.com/auth/cloud-platform";

function resolveProjectId(): string {
  return (
    process.env.GCLOUD_PROJECT_ID?.trim() ||
    process.env.GOOGLE_CLOUD_PROJECT_ID?.trim() ||
    ""
  );
}

function resolveRegion(): string {
  return (
    process.env.GCLOUD_REGION?.trim() ||
    process.env.VERTEX_AI_REGION?.trim() ||
    "us-central1"
  );
}

function resolveServiceAccountJson(): string {
  return (
    process.env.GCLOUD_SERVICE_ACCOUNT_JSON?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() ||
    ""
  );
}

function resolveModelId(): string {
  return process.env.VERTEX_AI_EMBEDDING_MODEL?.trim() || "text-embedding-004";
}

export function isVertexEmbeddingConfigured(): boolean {
  if (process.env.VERTEX_AI_EMBED_ENABLED !== "true") {
    return false;
  }
  return (
    resolveProjectId().length > 0 &&
    resolveServiceAccountJson().length > 10 &&
    resolveRegion().length > 0
  );
}

/** Texto estable para embedding y auditoría (misma forma que `embedMetrics`). */
export function formatApprovalMetricsEmbeddingText(metrics: ApprovalMetrics): string {
  return [
    `Success Rate: ${metrics.success_rate}%`,
    `Response Time: ${metrics.avg_response_time_ms}ms`,
    `Critical Errors: ${metrics.critical_errors}`,
    `Test Coverage: ${metrics.test_coverage.join(", ")}`,
  ].join("\n");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class VertexAIClient {
  private readonly projectId: string;

  private readonly region: string;

  private readonly modelId: string;

  private readonly jwt: JWT;

  private tokenCache: { token: string; until: number } | null = null;

  public constructor() {
    const projectId = resolveProjectId();
    const jsonRaw = resolveServiceAccountJson();
    if (projectId.length === 0 || jsonRaw.length < 20) {
      throw new Error("VertexAIClient: missing GCLOUD_PROJECT_ID/GOOGLE_CLOUD_PROJECT_ID or service account JSON");
    }
    let creds: { client_email?: string; private_key?: string };
    try {
      creds = JSON.parse(jsonRaw) as { client_email?: string; private_key?: string };
    } catch {
      throw new Error("VertexAIClient: invalid service account JSON");
    }
    if (typeof creds.client_email !== "string" || typeof creds.private_key !== "string") {
      throw new Error("VertexAIClient: service account JSON missing client_email/private_key");
    }
    this.projectId = projectId;
    this.region = resolveRegion();
    this.modelId = resolveModelId();
    this.jwt = new JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: [PREDICT_SCOPE],
    });
  }

  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.tokenCache && this.tokenCache.until > now + 60_000) {
      return this.tokenCache.token;
    }
    const res = await this.jwt.getAccessToken();
    const tok = res.token;
    const exp = this.jwt.credentials.expiry_date ?? now + 3_600_000;
    if (typeof tok !== "string" || tok.length === 0) {
      throw new Error("VertexAIClient: empty access_token");
    }
    this.tokenCache = { token: tok, until: exp };
    return tok;
  }

  private predictUrl(): string {
    const r = this.region;
    const p = encodeURIComponent(this.projectId);
    const m = encodeURIComponent(this.modelId);
    return `https://${r}-aiplatform.googleapis.com/v1/projects/${p}/locations/${r}/publishers/google/models/${m}:predict`;
  }

  public async embedText(text: string): Promise<EmbeddingResponse> {
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      throw new Error("VertexAIClient: embedText requires non-empty text");
    }
    const token = await this.getAccessToken();
    const url = this.predictUrl();
    const body = JSON.stringify({ instances: [{ content: trimmed }] });

    let lastErr: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body,
          signal: AbortSignal.timeout(60_000),
        });
        const raw = await res.text();
        if (!res.ok) {
          throw new Error(`Vertex predict HTTP ${String(res.status)}: ${raw.slice(0, 500)}`);
        }
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw) as unknown;
        } catch {
          throw new Error("Vertex predict: invalid JSON body");
        }
        const pred = parsed as VertexEmbeddingResponse;
        const values = pred.predictions?.[0]?.embeddings?.values;
        if (!Array.isArray(values) || values.length === 0) {
          throw new Error("Vertex predict: missing predictions[0].embeddings.values");
        }
        if (values.length !== VERTEX_TEXT_EMBEDDING_004_DIM) {
          console.warn(
            `[VertexAI] unexpected embedding dim ${String(values.length)}, expected ${String(VERTEX_TEXT_EMBEDDING_004_DIM)}`,
          );
        }
        return {
          values: values.map((n) => Number(n)),
          dimension: values.length,
        };
      } catch (e) {
        lastErr = e;
        if (attempt < 2) {
          await sleep(500 * (attempt + 1));
        }
      }
    }
    throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
  }

  public async embedMetrics(metrics: ApprovalMetrics): Promise<EmbeddingResponse> {
    return this.embedText(formatApprovalMetricsEmbeddingText(metrics));
  }
}
