import { Job, Worker } from "bullmq";
import { resolveGithubPat } from "../lib/github-pat.js";
import { logWorkerLifecycle } from "../observability/worker-log.js";
import { notifyDiscord } from "./NotifyWorker.js";

export interface MemoryWritePayload {
  task_id: string;
  result: "pass" | "fail";
  summary: string;
  timestamp: string;
}

const REPO = process.env.OPSLY_GITHUB_REPO ?? "cloudsysops/opsly";

async function getFileSHA(path: string, token: string): Promise<string | null> {
  const url = `https://api.github.com/repos/${REPO}/contents/${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { sha?: string };
  return data.sha ?? null;
}

async function putFile(path: string, content: string, sha: string | null, token: string, message: string): Promise<void> {
  const url = `https://api.github.com/repos/${REPO}/contents/${path}`;
  const body: Record<string, string> = {
    message,
    content: Buffer.from(content).toString("base64"),
  };
  if (sha) body.sha = sha;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub PUT ${path} failed: ${res.status} ${text}`);
  }
}

async function readFile(path: string, token: string): Promise<string | null> {
  const url = `https://api.github.com/repos/${REPO}/contents/${path}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { content?: string };
  if (!data.content) return null;
  return Buffer.from(data.content.replace(/\n/g, ""), "base64").toString("utf-8");
}

export function startMemoryWriterWorker(connection: object): Worker {
  return new Worker<MemoryWritePayload>(
    "openclaw",
    async (job: Job<MemoryWritePayload>) => {
      if (job.name !== "memory-write") return;

      const t0 = Date.now();
      logWorkerLifecycle("start", "memory-writer", job);

      const { task_id, result, summary, timestamp } = job.data;
      const token = resolveGithubPat();
      if (!token) throw new Error("GITHUB_TOKEN required");

      const resultEmoji = result === "pass" ? "✅" : "❌";
      const newEntry = `| ${timestamp} | ${task_id} | ${resultEmoji} ${result} | ${summary} |`;

      // 1. Actualizar MAIA-STATUS.md
      const statusPath = "docs/MAIA-STATUS.md";
      const statusSHA = await getFileSHA(statusPath, token);
      const existingStatus = await readFile(statusPath, token);

      let newStatus: string;
      if (existingStatus && existingStatus.includes("## Historial")) {
        newStatus = existingStatus.replace(
          "## Historial\n",
          `## Historial\n${newEntry}\n`
        ).replace(
          /(\| Campo\s+\| Valor\s+\|[\s\S]*?\| Timestamp \| )[^\n]*/,
          `$1${timestamp}`
        );
      } else {
        newStatus = [
          "# MAIA-STATUS — Loop Autónomo",
          "",
          "Archivo actualizado automáticamente por MemoryWriterWorker.",
          "",
          "## Último ciclo",
          "",
          `| Campo | Valor |`,
          `|-------|-------|`,
          `| Job ID | ${task_id} |`,
          `| Estado | ${result} |`,
          `| Timestamp | ${timestamp} |`,
          "",
          "## Historial",
          "",
          "| Timestamp | Job ID | Estado | Resumen |",
          "|-----------|--------|--------|---------|",
          newEntry,
        ].join("\n");
      }

      await putFile(statusPath, newStatus, statusSHA, token,
        `chore(maia): update status — ${task_id} ${result}`);

      await notifyDiscord(
        `🧠 Memoria actualizada`,
        `Task: ${task_id} → ${resultEmoji} ${result}\n${summary}`,
        "info"
      );

      logWorkerLifecycle("complete", "memory-writer", job, { duration_ms: Date.now() - t0, task_id });
      return { success: true, task_id };
    },
    { connection, concurrency: 1 } // escrituras secuenciales para evitar conflictos en GitHub
  );
}
