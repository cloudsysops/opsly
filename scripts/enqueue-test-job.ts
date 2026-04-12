/**
 * Encola un job de prueba en la cola BullMQ `openclaw` (misma que `apps/orchestrator`).
 *
 * - Modo `cursor`: equivale a la acción del planner `execute_prompt` (worker Cursor; requiere GITHUB_TOKEN o GITHUB_TOKEN_N8N en el orchestrator).
 * - Modo `notify`: job `notify` (suele completar sin dependencias externas si DISCORD_WEBHOOK_URL está vacío).
 *
 * Uso:
 *   doppler run --project ops-intcloudsysops --config prd -- npx tsx scripts/enqueue-test-job.ts smiletripcare
 *   npx tsx scripts/enqueue-test-job.ts smiletripcare --notify
 */

import { Queue, type Job } from "bullmq";
import { config as loadEnv } from "dotenv";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env") });

type JobKind = "cursor" | "notify";

interface OrchestratorJob {
  type: JobKind;
  payload: Record<string, unknown>;
  initiated_by: "claude" | "discord" | "cron" | "system";
  tenant_slug?: string;
  request_id?: string;
  plan?: "startup" | "business" | "enterprise";
}

function parseRedisConnection(): { host: string; port: number; password?: string } {
  const raw = process.env.REDIS_URL?.trim();
  if (!raw) {
    throw new Error("REDIS_URL is required (Doppler prd o .env local)");
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("REDIS_URL is not a valid URL");
  }
  const passwordFromUrl = url.password ? decodeURIComponent(url.password) : "";
  return {
    host: url.hostname,
    port: Number(url.port || "6379"),
    password: process.env.REDIS_PASSWORD || passwordFromUrl || undefined,
  };
}

function redactRedisUrlForLog(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.password) {
      u.password = "***";
    }
    return u.origin + u.pathname;
  } catch {
    return "(REDIS_URL inválida)";
  }
}

const POLL_MS = 2000;
const TIMEOUT_MS = 60_000;

function parseArgs(argv: string[]): { tenant: string; kind: JobKind } {
  const rest = argv.slice(2).filter((a) => a.length > 0);
  if (rest.length === 0) {
    throw new Error("Uso: npx tsx scripts/enqueue-test-job.ts <tenant_slug> [--notify]");
  }
  const tenant = rest[0];
  const notify = rest.includes("--notify");
  return {
    tenant,
    kind: notify ? "notify" : "cursor",
  };
}

function buildJob(tenant: string, requestId: string, kind: JobKind): OrchestratorJob {
  if (kind === "notify") {
    return {
      type: "notify",
      payload: {
        title: "Opsly enqueue test",
        message: `tenant=${tenant} request_id=${requestId}`,
        type: "info" as const,
      },
      initiated_by: "system",
      tenant_slug: tenant,
      request_id: requestId,
      plan: "startup",
    };
  }
  return {
    type: "cursor",
    payload: {
      task: "enqueue-test-job E2E",
      tenant_slug: tenant,
      commands: [] as string[],
      planner_tool: "execute_prompt",
    },
    initiated_by: "system",
    tenant_slug: tenant,
    request_id: requestId,
    plan: "startup",
  };
}

async function waitForTerminalState(
  queue: Queue,
  job: Job,
  bullId: string,
  kind: JobKind,
): Promise<number> {
  const t0 = Date.now();
  while (Date.now() - t0 < TIMEOUT_MS) {
    const state = await job.getState();
    const elapsed = Math.round((Date.now() - t0) / 1000);
    process.stdout.write(
      `   [${elapsed}s] estado=${state}  jobId=${bullId || String(job.id)}\n`,
    );

    if (state === "completed") {
      const finished = bullId ? await queue.getJob(bullId) : undefined;
      const rv = finished?.returnvalue as unknown;
      process.stdout.write("\n✅ Job completado\n");
      process.stdout.write(`   Resultado (resumen): ${safeJsonSummary(rv)}\n`);
      return 0;
    }
    if (state === "failed") {
      const failedJob = bullId ? await queue.getJob(bullId) : undefined;
      const reason = failedJob?.failedReason ?? job.failedReason ?? "(sin razón)";
      process.stdout.write("\n❌ Job falló\n");
      process.stdout.write(`   Razón: ${reason}\n`);
      if (kind === "cursor") {
        process.stdout.write(
          "   Sugerencia: el worker `cursor` requiere GITHUB_TOKEN (o GITHUB_TOKEN_N8N) en el orchestrator. Prueba: --notify\n",
        );
      }
      return 1;
    }

    await new Promise((r) => setTimeout(r, POLL_MS));
  }

  process.stdout.write("\n⏱️ Timeout 60s esperando estado terminal\n");
  return 124;
}

async function main(): Promise<number> {
  const { tenant, kind } = parseArgs(process.argv);
  const requestId = `test-${Date.now()}-${randomUUID().slice(0, 8)}`;

  const redisUrl = process.env.REDIS_URL?.trim();
  if (!redisUrl) {
    process.stderr.write("ERROR: REDIS_URL no definida.\n");
    return 1;
  }

  process.stdout.write("📤 Encolando job de prueba…\n");
  process.stdout.write(`   Tenant: ${tenant}\n`);
  process.stdout.write(`   Request ID: ${requestId}\n`);
  process.stdout.write(`   Cola: openclaw  |  tipo BullMQ: ${kind}  |  acción lógica: ${kind === "cursor" ? "execute_prompt" : "notify"}\n`);
  process.stdout.write(`   Redis: ${redactRedisUrlForLog(redisUrl)}\n\n`);

  const connection = parseRedisConnection();
  const queue = new Queue("openclaw", { connection });
  const jobData = buildJob(tenant, requestId, kind);

  let job: Job;
  try {
    job = await queue.add(jobData.type, jobData, {
      attempts: 1,
      priority: 10,
      removeOnComplete: 100,
      removeOnFail: 50,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`ERROR al encolar: ${msg}\n`);
    await queue.close();
    return 1;
  }

  process.stdout.write("✅ Job encolado\n");
  process.stdout.write(`   Job ID: ${String(job.id)}\n\n`);
  process.stdout.write("👀 Esperando procesamiento (timeout 60s, poll 2s)…\n\n");

  const bullId = job.id !== undefined && job.id !== null ? String(job.id) : "";
  const exitCode = await waitForTerminalState(queue, job, bullId, kind);
  await queue.close();
  return exitCode;
}

function safeJsonSummary(value: unknown): string {
  try {
    const s = JSON.stringify(value);
    if (s.length > 400) {
      return `${s.slice(0, 400)}…`;
    }
    return s;
  } catch {
    if (value !== null && typeof value === "object") {
      return "[objeto no serializable]";
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    if (value === null) {
      return "null";
    }
    if (value === undefined) {
      return "undefined";
    }
    return "[valor no serializable]";
  }
}

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err) => {
    const msg = err instanceof Error ? err.message : String(err);
    process.stderr.write(`ERROR: ${msg}\n`);
    process.exitCode = 1;
  });
