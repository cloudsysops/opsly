import { Job, Worker } from "bullmq";
import { resolveGithubPat } from "../lib/github-pat.js";
import { logWorkerLifecycle } from "../observability/worker-log.js";
import { notifyDiscord } from "./NotifyWorker.js";
import { orchestratorQueue } from "../queue.js";
import { getTasksByAgent } from "../agents/autonomous-tasks.js";

export interface ValidationPayload {
  task_id: string;
  agent: "dev" | "devops" | "security" | "cost-optimizer";
  commit_sha?: string;
  pr_url?: string;
  retry_count?: number;
}

type CIConclusion = "success" | "failure" | "cancelled" | "timed_out" | "pending";

const REPO = process.env.OPSLY_GITHUB_REPO ?? "cloudsysops/opsly";
const MAX_RETRIES = 3;
const POLL_INTERVAL_MS = 30_000;
const POLL_TIMEOUT_MS = 5 * 60_000;

async function fetchCIConclusion(sha: string, token: string): Promise<CIConclusion> {
  const url = `https://api.github.com/repos/${REPO}/actions/runs?head_sha=${sha}&per_page=5`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return "failure";

  const data = (await res.json()) as { workflow_runs?: { status: string; conclusion: string | null }[] };
  const runs = data.workflow_runs ?? [];
  if (runs.length === 0) return "pending";

  const latest = runs[0];
  if (latest.status === "queued" || latest.status === "in_progress") return "pending";
  if (latest.conclusion === "success") return "success";
  return "failure";
}

async function pollCI(sha: string, token: string): Promise<CIConclusion> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const result = await fetchCIConclusion(sha, token);
    if (result !== "pending") return result;
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return "timed_out";
}

function getNextTask(taskId: string, agent: string): string | null {
  const tasks = getTasksByAgent(agent as "dev" | "devops" | "security" | "cost-optimizer");
  const idx = tasks.findIndex(t => t.id === taskId);
  if (idx === -1 || idx >= tasks.length - 1) return null;
  return tasks[idx + 1].id;
}

export function startValidationWorker(connection: object): Worker {
  return new Worker<ValidationPayload>(
    "openclaw",
    async (job: Job<ValidationPayload>) => {
      if (job.name !== "validate") return;

      const t0 = Date.now();
      logWorkerLifecycle("start", "validation", job);

      const { task_id, agent, commit_sha, pr_url, retry_count = 0 } = job.data;
      const token = resolveGithubPat();

      if (!token) throw new Error("GITHUB_TOKEN required for ValidationWorker");
      if (!commit_sha) {
        logWorkerLifecycle("complete", "validation", job, { skipped: true, reason: "no_commit_sha" });
        return { skipped: true };
      }

      const conclusion = await pollCI(commit_sha, token);

      if (conclusion === "success") {
        const nextTaskId = getNextTask(task_id, agent);

        await notifyDiscord(
          "✅ Validación PASS",
          `Task: ${task_id}\nCommit: ${commit_sha.slice(0, 8)}\nPR: ${pr_url ?? "—"}\nSiguiente: ${nextTaskId ?? "ninguna (sprint completo)"}`,
          "success"
        );

        // Encolar siguiente tarea si existe
        if (nextTaskId) {
          await orchestratorQueue.add("route-intent", {
            task_id: nextTaskId,
            agent,
            triggered_by: `validation_pass:${task_id}`,
          });
        }

        // Actualizar memoria
        await orchestratorQueue.add("memory-write", {
          task_id,
          result: "pass",
          summary: `CI success. Commit ${commit_sha.slice(0, 8)}.`,
          timestamp: new Date().toISOString(),
        });

        logWorkerLifecycle("complete", "validation", job, {
          duration_ms: Date.now() - t0,
          conclusion,
          next_task: nextTaskId,
        });

        return { status: "pass", next_task_id: nextTaskId };
      }

      // FAIL
      if (retry_count >= MAX_RETRIES) {
        await notifyDiscord(
          "🚨 Validación FAIL — max retries",
          `Task: ${task_id}\nIntentos: ${retry_count + 1}/${MAX_RETRIES}\nConclusion: ${conclusion}\nPR: ${pr_url ?? "—"}`,
          "error"
        );

        await orchestratorQueue.add("memory-write", {
          task_id,
          result: "fail",
          summary: `CI ${conclusion} after ${retry_count + 1} retries.`,
          timestamp: new Date().toISOString(),
        });

        logWorkerLifecycle("fail", "validation", job, {
          duration_ms: Date.now() - t0,
          conclusion,
          retries_exhausted: true,
        });

        return { status: "max_retries", task_id };
      }

      // Re-encolar con contexto del error
      await notifyDiscord(
        "⚠️ Validación FAIL — reintentando",
        `Task: ${task_id} | Intento ${retry_count + 1}/${MAX_RETRIES}\nConclusion: ${conclusion}`,
        "info"
      );

      await orchestratorQueue.add("cursor", {
        payload: {
          task: `Fix CI failure: ${task_id} (intento ${retry_count + 2})`,
          tenant_slug: "platform",
          commands: [
            `La tarea ${task_id} falló CI con conclusion: ${conclusion}`,
            `Commit: ${commit_sha}`,
            `Revisa los logs de CI en GitHub Actions, identifica el error y corrígelo.`,
            `Haz commit del fix en la misma rama.`,
          ],
        },
        retry_count: retry_count + 1,
        original_task_id: task_id,
      });

      logWorkerLifecycle("complete", "validation", job, {
        duration_ms: Date.now() - t0,
        conclusion,
        retry_count: retry_count + 1,
      });

      return { status: "fail", retry_count: retry_count + 1 };
    },
    { connection, concurrency: 5 }
  );
}
