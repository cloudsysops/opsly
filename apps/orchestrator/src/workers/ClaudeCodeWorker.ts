import Anthropic from "@anthropic-ai/sdk";
import { Job, Worker } from "bullmq";
import { resolveGithubPat } from "../lib/github-pat.js";
import { logWorkerLifecycle } from "../observability/worker-log.js";
import { notifyDiscord } from "./NotifyWorker.js";

export interface ClaudeCodePayload {
  task_id: string;
  title: string;
  description: string;
  acceptance_criteria: string[];
  tenant_slug?: string;
}

const REPO = process.env.OPSLY_GITHUB_REPO ?? "cloudsysops/opsly";
const MODEL = (process.env.ORCHESTRATOR_MODEL ?? "claude-sonnet-4-6") as Anthropic.Model;

async function writeOutputToGitHub(taskId: string, content: string): Promise<void> {
  const token = resolveGithubPat();
  if (!token) throw new Error("GITHUB_TOKEN required");

  const path = `docs/claude-code-output/${taskId}-${Date.now()}.md`;
  const url = `https://api.github.com/repos/${REPO}/contents/${path}`;

  const res = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `feat(maia): claude-code output for ${taskId}`,
      content: Buffer.from(content).toString("base64"),
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub write failed: ${res.status} ${text}`);
  }
}

export function startClaudeCodeWorker(connection: object): Worker {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  return new Worker<ClaudeCodePayload>(
    "openclaw",
    async (job: Job<ClaudeCodePayload>) => {
      if (job.name !== "claude-code") return;

      const t0 = Date.now();
      logWorkerLifecycle("start", "claude-code", job);

      const { task_id, title, description, acceptance_criteria } = job.data;

      await notifyDiscord(
        "🤖 Claude Code ejecutando",
        `Tarea: ${title}\nID: ${task_id}`,
        "info"
      );

      const systemPrompt = [
        "Eres el arquitecto senior de Opsly.",
        "Implementas tareas de código siguiendo las reglas de AGENTS.md.",
        "Nunca usas `any` en TypeScript. Sigues TDD con Vitest. DI sobre vi.mock.",
        "Stack: Node.js + TypeScript + BullMQ + Supabase + Docker Compose por tenant.",
        "Reglas absolutas: Docker Compose (no K8s), Traefik (no nginx), Doppler (no .env).",
      ].join("\n");

      const userPrompt = [
        `## Tarea: ${title}`,
        `## ID: ${task_id}`,
        "",
        "## Descripción:",
        description,
        "",
        "## Criterios de aceptación:",
        ...acceptance_criteria.map(c => `- ${c}`),
        "",
        "Implementa la solución completa con tipos estrictos y tests.",
        "Incluye el código de cada archivo nuevo o modificado.",
      ].join("\n");

      const message = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const responseText = message.content
        .filter(b => b.type === "text")
        .map(b => (b as { type: "text"; text: string }).text)
        .join("\n");

      await writeOutputToGitHub(task_id, responseText);

      await notifyDiscord(
        "✅ Claude Code completado",
        `Tarea: ${title}\nID: ${task_id}\nOutput guardado en docs/claude-code-output/`,
        "success"
      );

      logWorkerLifecycle("complete", "claude-code", job, {
        duration_ms: Date.now() - t0,
        task_id,
        tokens_used: message.usage.input_tokens + message.usage.output_tokens,
      });

      return { success: true, job_id: job.id, task_id };
    },
    { connection, concurrency: 2 }
  );
}
