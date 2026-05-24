---
status: draft
owner: operations
last_review: 2026-05-24
type: guide
tags:
  - opsly/development
---

# MAIA Workers — Implementación completa

> Documento generado por Claude (arquitecto). Contiene el código fuente de los 6 workers nuevos.
> El auto-push-watcher sube este archivo a GitHub automáticamente desde `docs/`.
> Cursor lee este archivo y ejecuta la integración en `apps/orchestrator/src/`.

## Estado: PENDIENTE DE INTEGRACIÓN

### Workers a registrar en `apps/orchestrator/src/index.ts`

```typescript
import { startSelfHealWorker }    from "./workers/SelfHealWorker.js";
import { startAutoDeployWorker }  from "./workers/AutoDeployWorker.js";
import { startCostGateWorker }    from "./workers/CostGateWorker.js";
import { startClaudeCodeWorker }  from "./workers/ClaudeCodeWorker.js";
import { startValidationWorker }  from "./workers/ValidationWorker.js";
import { startMemoryWriterWorker } from "./workers/MemoryWriterWorker.js";
```

Y dentro de `startAllWorkers()` agregar:

```typescript
startSelfHealWorker(connection);
startAutoDeployWorker(connection);
startCostGateWorker(connection);
startClaudeCodeWorker(connection);
startValidationWorker(connection);
startMemoryWriterWorker(connection);
```

---

## 1. SelfHealWorker.ts

**Ruta:** `apps/orchestrator/src/workers/SelfHealWorker.ts`
**BullMQ job:** `"self-heal"` | **concurrency:** 3
**Acciones:** `restart` → docker restart via SSH Tailscale | `refresh-env` → script vps | `full-restart` → encola cursor diagnóstico

```typescript
import { Job, Worker } from "bullmq";
import { logWorkerLifecycle } from "../observability/worker-log.js";
import { notifyDiscord } from "./NotifyWorker.js";
import { orchestratorQueue } from "../queue.js";

export interface SelfHealPayload {
  tenant_slug: string;
  service: string;
  action: "restart" | "refresh-env" | "full-restart";
  reason: string;
}

const VPS_SSH = process.env.VPS_TAILSCALE_HOST ?? "vps-dragon@100.120.151.91";
const OPSLY_ROOT = process.env.VPS_OPSLY_ROOT ?? "/opt/opsly";

async function runSSH(cmd: string): Promise<{ ok: boolean; output: string }> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const execFileAsync = promisify(execFile);
  try {
    const { stdout, stderr } = await execFileAsync("ssh", [
      "-o", "StrictHostKeyChecking=no",
      "-o", "ConnectTimeout=10",
      VPS_SSH,
      cmd,
    ]);
    return { ok: true, output: stdout + stderr };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, output: msg };
  }
}

export function startSelfHealWorker(connection: object): Worker {
  return new Worker<SelfHealPayload>(
    "openclaw",
    async (job: Job<SelfHealPayload>) => {
      if (job.name !== "self-heal") return;
      const t0 = Date.now();
      logWorkerLifecycle("start", "self-heal", job);
      const { tenant_slug, service, action, reason } = job.data;
      await notifyDiscord(`🔧 Self-Heal iniciado`,
        `Tenant: ${tenant_slug}\nServicio: ${service}\nAcción: ${action}\nRazón: ${reason}`, "info");
      let result: { ok: boolean; output: string };
      switch (action) {
        case "restart":
          result = await runSSH(`docker restart ${service} 2>&1 | tail -5`);
          break;
        case "refresh-env":
          result = await runSSH(`cd ${OPSLY_ROOT} && ./scripts/vps-refresh-api-env.sh 2>&1 | tail -10`);
          break;
        case "full-restart":
          await orchestratorQueue.add("cursor", {
            payload: {
              task: `Diagnóstico y recovery: ${service} en ${tenant_slug}`,
              tenant_slug,
              commands: [
                `Servicio ${service} requiere restart completo. Razón: ${reason}`,
                `Verificar logs: docker logs ${service} --tail 50`,
                `Proponer fix y ejecutar: docker compose -f infra/docker-compose.platform.yml up -d`,
              ],
            },
          });
          result = { ok: true, output: "Diagnóstico encolado para Cursor" };
          break;
      }
      const level = result.ok ? "success" : "error";
      await notifyDiscord(
        result.ok ? `✅ Self-Heal completado` : `🚨 Self-Heal falló`,
        `Tenant: ${tenant_slug} | Servicio: ${service}\nResultado: ${result.output.slice(0, 200)}`, level);
      logWorkerLifecycle(result.ok ? "complete" : "fail", "self-heal", job,
        { duration_ms: Date.now() - t0, action, ok: result.ok });
      if (!result.ok) throw new Error(result.output);
      return { success: true, action, tenant_slug, service };
    },
    { connection, concurrency: 3 }
  );
}
```

---

## 2. AutoDeployWorker.ts

**Ruta:** `apps/orchestrator/src/workers/AutoDeployWorker.ts`
**BullMQ job:** `"auto-deploy"` | **concurrency:** 1 (secuencial)
**Flujo:** SSH VPS → git pull → docker build → health check

```typescript
import { Job, Worker } from "bullmq";
import { logWorkerLifecycle } from "../observability/worker-log.js";
import { notifyDiscord } from "./NotifyWorker.js";

export interface AutoDeployPayload {
  commit_sha: string;
  branch: string;
  triggered_by?: string;
}

const VPS_SSH = process.env.VPS_TAILSCALE_HOST ?? "vps-dragon@100.120.151.91";
const OPSLY_ROOT = process.env.VPS_OPSLY_ROOT ?? "/opt/opsly";
const PLATFORM_DOMAIN = process.env.PLATFORM_DOMAIN ?? "ops.smiletripcare.com";

async function runSSH(cmd: string): Promise<{ ok: boolean; output: string }> {
  const { execFile } = await import("child_process");
  const { promisify } = await import("util");
  const execFileAsync = promisify(execFile);
  try {
    const { stdout, stderr } = await execFileAsync("ssh", [
      "-o", "StrictHostKeyChecking=no",
      "-o", "ConnectTimeout=15",
      VPS_SSH, cmd,
    ], { timeout: 120_000 });
    return { ok: true, output: stdout + stderr };
  } catch (err) {
    return { ok: false, output: err instanceof Error ? err.message : String(err) };
  }
}

export function startAutoDeployWorker(connection: object): Worker {
  return new Worker<AutoDeployPayload>(
    "openclaw",
    async (job: Job<AutoDeployPayload>) => {
      if (job.name !== "auto-deploy") return;
      const t0 = Date.now();
      logWorkerLifecycle("start", "auto-deploy", job);
      const { commit_sha, branch, triggered_by } = job.data;
      if (branch !== "main" && branch !== "refs/heads/main") {
        return { skipped: true, reason: "not main branch" };
      }
      await notifyDiscord("🚀 Auto-Deploy iniciado",
        `Commit: ${commit_sha.slice(0, 8)}\nBranch: ${branch}\nTriggered by: ${triggered_by ?? "CI"}`, "info");
      const deployCmd = [
        `cd ${OPSLY_ROOT}`,
        `git fetch origin`,
        `git reset --hard origin/main`,
        `npm ci --workspace=apps/api --workspace=apps/admin 2>&1 | tail -5`,
        `docker compose -f infra/docker-compose.platform.yml up -d --build app 2>&1 | tail -10`,
      ].join(" && ");
      const deployResult = await runSSH(deployCmd);
      if (!deployResult.ok) {
        await notifyDiscord("🚨 Deploy falló en VPS",
          `Commit: ${commit_sha.slice(0, 8)}\nError: ${deployResult.output.slice(0, 300)}`, "error");
        logWorkerLifecycle("fail", "auto-deploy", job, { duration_ms: Date.now() - t0 });
        throw new Error(`Deploy SSH failed: ${deployResult.output}`);
      }
      await new Promise(resolve => setTimeout(resolve, 30_000));
      const healthRes = await fetch(`https://api.${PLATFORM_DOMAIN}/api/health`,
        { signal: AbortSignal.timeout(60_000) }).catch(() => null);
      if (!healthRes?.ok) {
        await notifyDiscord("🚨 Deploy: health check falló",
          `Commit: ${commit_sha.slice(0, 8)}\nAPI no responde. Rollback manual requerido.`, "error");
        throw new Error("Health check failed after deploy");
      }
      await notifyDiscord("✅ Deploy exitoso",
        `Commit: ${commit_sha.slice(0, 8)}\nhttps://api.${PLATFORM_DOMAIN}/api/health ✓`, "success");
      logWorkerLifecycle("complete", "auto-deploy", job,
        { duration_ms: Date.now() - t0, commit_sha });
      return { success: true, commit_sha, healthy: true };
    },
    { connection, concurrency: 1 }
  );
}
```

---

## 3. CostGateWorker.ts

**Ruta:** `apps/orchestrator/src/workers/CostGateWorker.ts`
**BullMQ job:** `"cost-check"` | **concurrency:** 20
**Lógica:** Redis `hermes:cost:<slug>:<YYYY-MM>` → < 80% ALLOW | 80–99% WARN | ≥ 100% BLOCK + Ollama fallback

```typescript
import { Job, Worker } from "bullmq";
import { logWorkerLifecycle } from "../observability/worker-log.js";
import { notifyDiscord } from "./NotifyWorker.js";
import { orchestratorQueue } from "../queue.js";

export interface CostGatePayload {
  tenant_slug: string;
  downstream_job_name: string;
  downstream_payload: Record<string, unknown>;
  estimated_tokens?: number;
  model?: string;
}

export interface CostStatus {
  used_usd: number;
  budget_usd: number;
  usage_pct: number;
}

async function getCostStatus(tenantSlug: string): Promise<CostStatus> {
  const { default: Redis } = await import("ioredis");
  const redis = new Redis(process.env.REDIS_URL ?? "redis://127.0.0.1:6379");
  const month = new Date().toISOString().slice(0, 7);
  const key = `hermes:cost:${tenantSlug}:${month}`;
  try {
    const raw = await redis.get(key);
    const usedUsd = raw ? parseFloat(raw) : 0;
    const budgetEnv = process.env[`BUDGET_USD_${tenantSlug.toUpperCase()}`];
    const budgetUsd = budgetEnv ? parseFloat(budgetEnv) : 10;
    return { used_usd: usedUsd, budget_usd: budgetUsd, usage_pct: Math.round((usedUsd / budgetUsd) * 100) };
  } finally {
    await redis.quit();
  }
}

export function startCostGateWorker(connection: object): Worker {
  return new Worker<CostGatePayload>(
    "openclaw",
    async (job: Job<CostGatePayload>) => {
      if (job.name !== "cost-check") return;
      const t0 = Date.now();
      logWorkerLifecycle("start", "cost-gate", job);
      const { tenant_slug, downstream_job_name, downstream_payload, model } = job.data;
      const status = await getCostStatus(tenant_slug);
      if (status.usage_pct >= 100) {
        await notifyDiscord("🚫 Budget agotado",
          `Tenant: ${tenant_slug}\nUsado: $${status.used_usd.toFixed(2)} / $${status.budget_usd.toFixed(2)} (${status.usage_pct}%)\nJob bloqueado: ${downstream_job_name}`, "error");
        if (downstream_job_name === "cursor" || downstream_job_name === "claude-code") {
          await orchestratorQueue.add("ollama", { ...downstream_payload, fallback_reason: "budget_exceeded" });
        }
        return { decision: "block", usage_pct: status.usage_pct };
      }
      if (status.usage_pct >= 80) {
        await notifyDiscord("⚠️ Presupuesto al 80%",
          `Tenant: ${tenant_slug}\n$${status.used_usd.toFixed(2)} / $${status.budget_usd.toFixed(2)} (${status.usage_pct}%)\nModelo: ${model ?? "default"}`, "info");
      }
      await orchestratorQueue.add(downstream_job_name, downstream_payload);
      logWorkerLifecycle("complete", "cost-gate", job,
        { duration_ms: Date.now() - t0, decision: status.usage_pct >= 80 ? "warn" : "allow", usage_pct: status.usage_pct });
      return { decision: status.usage_pct >= 80 ? "warn" : "allow", usage_pct: status.usage_pct };
    },
    { connection, concurrency: 20 }
  );
}
```

---

## 4. ClaudeCodeWorker.ts

**Ruta:** `apps/orchestrator/src/workers/ClaudeCodeWorker.ts`
**BullMQ job:** `"claude-code"` | **concurrency:** 2
**Flujo:** Llama Anthropic SDK → guarda output en `docs/claude-code-output/` via GitHub API

```typescript
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
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify({ message: `feat(maia): claude-code output for ${taskId}`, content: Buffer.from(content).toString("base64") }),
  });
  if (!res.ok) throw new Error(`GitHub write failed: ${res.status} ${await res.text()}`);
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
      await notifyDiscord("🤖 Claude Code ejecutando", `Tarea: ${title}\nID: ${task_id}`, "info");
      const message = await anthropic.messages.create({
        model: MODEL, max_tokens: 4096,
        system: "Eres el arquitecto senior de Opsly. Stack: Node.js+TypeScript+BullMQ+Supabase+Docker Compose. Nunca any. TDD Vitest. Docker Compose (no K8s).",
        messages: [{ role: "user", content: `## Tarea: ${title}\n\n${description}\n\nCriterios:\n${acceptance_criteria.map(c => `- ${c}`).join("\n")}` }],
      });
      const responseText = message.content.filter(b => b.type === "text").map(b => (b as { type: "text"; text: string }).text).join("\n");
      await writeOutputToGitHub(task_id, responseText);
      await notifyDiscord("✅ Claude Code completado", `Tarea: ${title}\nOutput → docs/claude-code-output/`, "success");
      logWorkerLifecycle("complete", "claude-code", job, { duration_ms: Date.now() - t0, task_id, tokens_used: message.usage.input_tokens + message.usage.output_tokens });
      return { success: true, job_id: job.id, task_id };
    },
    { connection, concurrency: 2 }
  );
}
```

---

## 5. ValidationWorker.ts

**Ruta:** `apps/orchestrator/src/workers/ValidationWorker.ts`
**BullMQ job:** `"validate"` | **concurrency:** 5
**Flujo:** Polling GitHub Actions API (30s, timeout 5min) → PASS: next task + memory-write | FAIL < 3 retries: re-encola cursor | FAIL ≥ 3: Discord + memory-write

```typescript
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

const REPO = process.env.OPSLY_GITHUB_REPO ?? "cloudsysops/opsly";
const MAX_RETRIES = 3;
const POLL_INTERVAL_MS = 30_000;
const POLL_TIMEOUT_MS = 5 * 60_000;

async function pollCI(sha: string, token: string): Promise<"success" | "failure" | "timed_out"> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const res = await fetch(`https://api.github.com/repos/${REPO}/actions/runs?head_sha=${sha}&per_page=5`,
      { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
    if (res.ok) {
      const data = (await res.json()) as { workflow_runs?: { status: string; conclusion: string | null }[] };
      const latest = (data.workflow_runs ?? [])[0];
      if (latest && latest.status !== "queued" && latest.status !== "in_progress") {
        return latest.conclusion === "success" ? "success" : "failure";
      }
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
  }
  return "timed_out";
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
      if (!token) throw new Error("GITHUB_TOKEN required");
      if (!commit_sha) return { skipped: true };
      const conclusion = await pollCI(commit_sha, token);
      if (conclusion === "success") {
        const tasks = getTasksByAgent(agent);
        const idx = tasks.findIndex(t => t.id === task_id);
        const nextTaskId = idx !== -1 && idx < tasks.length - 1 ? tasks[idx + 1].id : null;
        await notifyDiscord("✅ Validación PASS", `Task: ${task_id}\nCommit: ${commit_sha.slice(0, 8)}\nSiguiente: ${nextTaskId ?? "sprint completo"}`, "success");
        if (nextTaskId) await orchestratorQueue.add("route-intent", { task_id: nextTaskId, agent, triggered_by: `validation_pass:${task_id}` });
        await orchestratorQueue.add("memory-write", { task_id, result: "pass", summary: `CI success. Commit ${commit_sha.slice(0, 8)}.`, timestamp: new Date().toISOString() });
        return { status: "pass", next_task_id: nextTaskId };
      }
      if (retry_count >= MAX_RETRIES) {
        await notifyDiscord("🚨 Validación FAIL — max retries", `Task: ${task_id}\nIntentos: ${retry_count + 1}/${MAX_RETRIES}\nConclusion: ${conclusion}`, "error");
        await orchestratorQueue.add("memory-write", { task_id, result: "fail", summary: `CI ${conclusion} after ${retry_count + 1} retries.`, timestamp: new Date().toISOString() });
        return { status: "max_retries", task_id };
      }
      await notifyDiscord("⚠️ Validación FAIL — reintentando", `Task: ${task_id} | Intento ${retry_count + 1}/${MAX_RETRIES}`, "info");
      await orchestratorQueue.add("cursor", {
        payload: { task: `Fix CI failure: ${task_id} (intento ${retry_count + 2})`, tenant_slug: "platform",
          commands: [`La tarea ${task_id} falló CI con conclusion: ${conclusion}`, `Commit: ${commit_sha}`, `Revisa CI en GitHub Actions, identifica el error y corrígelo.`] },
        retry_count: retry_count + 1, original_task_id: task_id,
      });
      return { status: "fail", retry_count: retry_count + 1 };
    },
    { connection, concurrency: 5 }
  );
}
```

---

## 6. MemoryWriterWorker.ts

**Ruta:** `apps/orchestrator/src/workers/MemoryWriterWorker.ts`
**BullMQ job:** `"memory-write"` | **concurrency:** 1 (secuencial para evitar conflictos en GitHub)
**Flujo:** Actualiza `docs/MAIA-STATUS.md` via GitHub API (GET SHA → PUT nuevo contenido)

```typescript
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

async function putGitHubFile(path: string, content: string, sha: string | null, token: string, message: string): Promise<void> {
  const body: Record<string, string> = { message, content: Buffer.from(content).toString("base64") };
  if (sha) body.sha = sha;
  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub PUT ${path} failed: ${res.status} ${await res.text()}`);
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
      const statusPath = "docs/MAIA-STATUS.md";
      const shaRes = await fetch(`https://api.github.com/repos/${REPO}/contents/${statusPath}`,
        { headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json" } });
      const shaData = shaRes.ok ? (await shaRes.json()) as { sha?: string; content?: string } : { sha: null, content: null };
      const existing = shaData.content ? Buffer.from((shaData.content as string).replace(/\n/g, ""), "base64").toString("utf-8") : null;
      const newStatus = existing?.includes("## Historial")
        ? existing.replace("## Historial\n", `## Historial\n${newEntry}\n`)
        : ["# MAIA-STATUS — Loop Autónomo", "", "## Último ciclo", `| Campo | Valor |`, `|-------|-------|`, `| Job ID | ${task_id} |`, `| Estado | ${result} |`, `| Timestamp | ${timestamp} |`, "", "## Historial", "", "| Timestamp | Job ID | Estado | Resumen |", "|-----------|--------|--------|---------|", newEntry].join("\n");
      await putGitHubFile(statusPath, newStatus, shaData.sha ?? null, token, `chore(maia): update status — ${task_id} ${result}`);
      await notifyDiscord(`🧠 Memoria actualizada`, `Task: ${task_id} → ${resultEmoji} ${result}\n${summary}`, "info");
      logWorkerLifecycle("complete", "memory-writer", job, { duration_ms: Date.now() - t0, task_id });
      return { success: true, task_id };
    },
    { connection, concurrency: 1 }
  );
}
```

---

## Tareas pendientes para Cursor

1. **Registrar todos los workers** en `apps/orchestrator/src/index.ts` (imports + llamadas en `startAllWorkers()`)
2. **Agregar campo `executor`** a `AutonomousTask` en `apps/orchestrator/src/agents/autonomous-tasks.ts`
3. **Crear `ExecutorRouter`** en `apps/orchestrator/src/agents/executor-router.ts`
4. **Crear endpoint `/api/maia/callback`** en `apps/orchestrator/src/routes/maia-callback.ts`
5. **Importar workflows n8n** desde `docs/n8n-workflows/` a la instancia n8n del VPS
6. **Agregar `CURSOR_AVAILABLE=true`** en Doppler proyecto `ops-intcloudsysops` config `prd`

## n8n Workflows (en `docs/n8n-workflows/`)

| Archivo | Descripción |
|---------|-------------|
| `eyes-self-heal.json` | Schedule cada 5min → health check → POST /api/maia/self-heal |
| `feet-stripe-to-tenant.json` | Stripe checkout.completed → provision tenant → health check |
| `heart-budget-alerts.json` | Schedule hourly → GET /api/costs/summary → Discord alert |
| `maia-github-push.json` | GitHub push webhook → filter maia/* → POST /api/maia/callback |

---

## Enlaces relacionados

- [[01-development/README|01-development]]
- [[brain/README|Brain Central]]
