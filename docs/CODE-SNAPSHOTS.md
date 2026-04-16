# Code snapshots (auto)

Generado por scripts/generate-code-snapshots.mjs — no editar a mano.

## packages/types/src/hermes.ts

```typescript
import { z } from "zod";

/** Estados del ciclo de vida Hermes (tarea). */
export const hermesTaskStateSchema = z.enum([
  "PENDING",
  "ROUTED",
  "EXECUTING",
  "COMPLETED",
  "FAILED",
  "BLOCKED",
]);

export type HermesTaskState = z.infer<typeof hermesTaskStateSchema>;

/** Tipos de tarea para enrutado (DecisionEngine). */
export const hermesTaskTypeSchema = z.enum([
  "feature",
  "adr",
  "infra",
  "task-management",
  "decision",
  "unknown",
]);

export type HermesTaskType = z.infer<typeof hermesTaskTypeSchema>;

export const hermesEffortSchema = z.enum(["S", "M", "L", "XL", "unknown"]);

export type HermesEffort = z.infer<typeof hermesEffortSchema>;

export const hermesAgentKindSchema = z.enum([
  "cursor",
  "claude",
  /** Inferencia vía worker `ollama` → LLM Gateway (`llama_local` / Ollama). */
  "ollama",
  "github_actions",
  "notion",
  "none",
]);

export type HermesAgentKind = z.infer<typeof hermesAgentKindSchema>;

/** Tarea coordinada por Hermes (persistencia + cola). */
export const hermesTaskSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: hermesTaskTypeSchema,
  state: hermesTaskStateSchema,
  assignee: z.string().optional(),
  effort: hermesEffortSchema.default("unknown"),
  tenant_id: z.string().min(1).optional(),
  request_id: z.string().min(1).optional(),
  idempotency_key: z.string().min(1).max(256).optional(),
  payload: z.record(z.unknown()).optional(),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

export type HermesTask = z.infer<typeof hermesTaskSchema>;

export const hermesAgentSchema = z.object({
  name: z.string().min(1),
  capabilities: z.array(z.string()).default([]),
  autonomy: z.enum(["low", "medium", "high"]).default("medium"),
});

export type HermesAgent = z.infer<typeof hermesAgentSchema>;

export const workflowStepSchema = z.object({
  id: z.string().min(1),
  task_ids: z.array(z.string()).default([]),
  parallel: z.boolean().default(false),
  depends_on: z.array(z.string()).default([]),
});

export type WorkflowStep = z.infer<typeof workflowStepSchema>;

export const hermesMetricSchema = z.object({
  agent: z.string().min(1),
  sprint: z.number().int().min(0).optional(),
  tasks_completed: z.number().int().min(0).default(0),
  tasks_failed: z.number().int().min(0).default(0),
  avg_execution_time_ms: z.number().int().min(0).optional(),
  success_rate: z.number().min(0).max(1).optional(),
  captured_at: z.string().optional(),
});

export type HermesMetric = z.infer<typeof hermesMetricSchema>;

export const hermesRoutingDecisionSchema = z.object({
  agentType: hermesAgentKindSchema,
  queueName: z.string().min(1),
  priority: z.number().int().min(0).optional(),
  secondary_agent: hermesAgentKindSchema.optional(),
  /** Resumen opcional del enriquecimiento (p. ej. NotebookLM + docs locales). */
  enrichment_summary: z.string().optional(),
});

export type HermesRoutingDecision = z.infer<typeof hermesRoutingDecisionSchema>;

```

## apps/orchestrator/src/hermes/DecisionEngine.ts

```typescript
import type {
  EnrichedTask,
  HermesRoutingDecision,
  HermesTask,
  HermesTaskType,
} from "@intcloudsysops/types";

/**
 * Enruta tareas Hermes a colas BullMQ existentes (sin nuevo bus).
 * La ejecución real sigue en workers OpenClaw (`openclaw`, etc.).
 */
export class DecisionEngine {
  route(task: HermesTask): HermesRoutingDecision {
    return this.routeWithContext(task, undefined);
  }

  /**
   * Enrutado con contexto NotebookLM + docs locales (opcional).
   */
  routeWithContext(task: HermesTask, enriched?: EnrichedTask): HermesRoutingDecision {
    const t: HermesTaskType = task.type;
    const effort = task.effort;

    const base = this.baseRoute(t, effort);
    if (!enriched?.notebooklm?.answer) {
      return base;
    }

    const summary = enriched.notebooklm.answer.slice(0, 240);
    if (enriched.notebooklm.confidence >= 0.5 && t === "decision") {
      return {
        ...base,
        priority: Math.min(base.priority ?? 50_000, 5_000),
        enrichment_summary: summary,
      };
    }

    return {
      ...base,
      enrichment_summary: summary,
    };
  }

  private baseRoute(t: HermesTaskType, effort: HermesTask["effort"]): HermesRoutingDecision {
    const localLlmFirst = process.env.HERMES_LOCAL_LLM_FIRST === "true";

    /** Decisiones rápidas (esfuerzo S) → Ollama local primero si está activado (ADR-024). */
    if (localLlmFirst && t === "decision" && effort === "S") {
      return { agentType: "ollama", queueName: "openclaw", priority: 0 };
    }

    if (t === "feature" && (effort === "M" || effort === "L" || effort === "XL")) {
      return {
        agentType: "cursor",
        queueName: "openclaw",
        priority: 10_000,
        secondary_agent: "claude",
      };
    }
    if (t === "feature") {
      return { agentType: "cursor", queueName: "openclaw", priority: 50_000 };
    }
    if (t === "adr") {
      return { agentType: "claude", queueName: "openclaw", priority: 50_000 };
    }
    if (t === "infra") {
      return {
        agentType: "github_actions",
        queueName: "hermes-orchestration",
        priority: 50_000,
      };
    }
    if (t === "task-management") {
      return {
        agentType: "notion",
        queueName: "hermes-orchestration",
        priority: 50_000,
      };
    }
    if (t === "decision") {
      return { agentType: "claude", queueName: "openclaw", priority: 0 };
    }
    return {
      agentType: "none",
      queueName: "hermes-orchestration",
      priority: 50_000,
    };
  }
}

```

## apps/orchestrator/src/hermes/HermesOrchestrator.ts

```typescript
import type { HermesTask } from "@intcloudsysops/types";
import { NotebookLMClient } from "../lib/notebooklm-client.js";
import { enqueueJob } from "../queue.js";
import { getOrchestratorRedis } from "../metering/redis-client.js";
import {
  ContextEnricher,
  createContextEnricher,
  enrichTaskLocalOnly,
} from "./ContextEnricher.js";
import { DecisionEngine } from "./DecisionEngine.js";
import { DiscordNotifier } from "./DiscordNotifier.js";
import { logHermesEvent } from "./hermes-log.js";
import { MetricsCollector } from "./MetricsCollector.js";
import { getHermesSupabase } from "./supabase-client.js";
import { TaskStateManager } from "./TaskStateManager.js";
import { resolveHermesTenantContext } from "./resolve-hermes-tenant.js";

const HEARTBEAT_KEY = "hermes:heartbeat";

function parseSprint(): number {
  const raw = process.env.HERMES_SPRINT?.trim() ?? "1";
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : 1;
}

function shouldNotifyDiscord(): boolean {
  return process.env.HERMES_DISCORD_NOTIFY === "true";
}

function shouldDispatchOpenclaw(): boolean {
  return process.env.HERMES_DISPATCH_OPENCLAW === "true";
}

export class HermesOrchestrator {
  private readonly decision = new DecisionEngine();

  private readonly discord = new DiscordNotifier();

  private readonly supabase = getHermesSupabase();

  private enricher: ContextEnricher | null = createContextEnricher(this.supabase ?? undefined);

  async initialize(): Promise<void> {
    logHermesEvent("hermes_orchestrator_init", { ok: true });
    const client = new NotebookLMClient();
    if (client.isAvailable()) {
      const docs = await client.listDocuments();
      logHermesEvent("hermes_notebooklm_ready", { list_len: docs.length });
    } else {
      logHermesEvent("hermes_notebooklm_skip", {
        reason: "NOTEBOOKLM_ENABLED/NOTEBOOKLM_NOTEBOOK_ID",
      });
    }
  }

  async runTick(): Promise<{ processed: number; errors: string[] }> {
    const errors: string[] = [];
    const supabase = getHermesSupabase();
    if (!supabase) {
      logHermesEvent("hermes_tick_skip", { reason: "no_supabase" });
      return { processed: 0, errors: ["SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY missing"] };
    }

    const tsm = new TaskStateManager(supabase);
    const metrics = new MetricsCollector(supabase, parseSprint());
    let processed = 0;

    let pending: HermesTask[] = [];
    try {
      pending = await tsm.listTasksByStatus("PENDING");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      errors.push(msg);
      logHermesEvent("hermes_tick_error", { phase: "list", message: msg });
      return { processed: 0, errors };
    }

    const redis = getOrchestratorRedis();
    if (redis) {
      await redis.set(HEARTBEAT_KEY, new Date().toISOString(), "EX", 600).catch(() => {
        // no-op
      });
    }

    for (const task of pending) {
      const t0 = Date.now();
      try {
        const enriched = this.enricher
          ? await this.enricher.enrichTaskContext(task)
          : await enrichTaskLocalOnly(task);

        const nb = enriched.notebooklm;
        if (nb?.latency_ms !== undefined && nb.latency_ms > 0) {
          await metrics.recordNotebookLmCall(nb.answer.length > 0, nb.latency_ms);
        }

        const route = this.decision.routeWithContext(task, enriched);
        if (shouldNotifyDiscord()) {
          await this.discord.notifyTaskStart(task);
        }

        await tsm.updateTaskState(task.id, "PENDING", "ROUTED", {
          agent: route.agentType === "none" ? null : route.agentType,
        });

        const now = new Date().toISOString();
        await tsm.updateTaskState(task.id, "ROUTED", "EXECUTING", {
          started_at: now,
        });

        if (shouldDispatchOpenclaw() && route.agentType === "cursor") {
          await enqueueJob({
            type: "cursor",
            payload: {
              hermes_task_id: task.id,
              hermes_route: route,
              source: "hermes",
              notebooklm_context: enriched.suggestedApproach,
              notebooklm_answer: enriched.notebooklm?.answer?.slice(0, 2000),
              hermes_enrichment_summary: route.enrichment_summary,
            },
            initiated_by: "cron",
            taskId: task.id,
            tenant_id: task.tenant_id,
            request_id: task.request_id,
            idempotency_key: task.idempotency_key ?? `hermes:${task.id}`,
            metadata: { hermes: true, notebooklm: Boolean(nb?.answer) },
          });
        }

        if (shouldDispatchOpenclaw() && route.agentType === "ollama") {
          const tenantCtx = await resolveHermesTenantContext(task, supabase);
          const tenantSlug =
            tenantCtx?.tenantSlug ??
            process.env.HERMES_FALLBACK_TENANT_SLUG?.trim() ??
            "platform";
          const tenantId = tenantCtx?.tenantId ?? task.tenant_id;
          const prompt = [
            `Tarea Hermes: ${task.name}`,
            `Tipo: ${task.type} · esfuerzo: ${task.effort}`,
            enriched.suggestedApproach?.slice(0, 4000) ?? "",
            route.enrichment_summary ? `Contexto: ${route.enrichment_summary}` : "",
          ]
            .filter((line) => line.length > 0)
            .join("\n");

          await enqueueJob({
            type: "ollama",
            payload: {
              task_type: "analyze",
              prompt,
            },
            initiated_by: "cron",
            taskId: task.id,
            tenant_id: tenantId,
            tenant_slug: tenantSlug,
            request_id: task.request_id,
            idempotency_key: task.idempotency_key ?? `hermes:ollama:${task.id}`,
            metadata: {
              hermes: true,
              hermes_agent: "ollama",
              notebooklm: Boolean(nb?.answer),
            },
          });
        }

        const resultPayload = {
          mode: "v1_stub",
          queue: route.queueName,
          agent: route.agentType,
          enrichment: route.enrichment_summary ?? "",
        };
        await tsm.recordExecution(task.id, route.agentType, resultPayload);

        const done = new Date().toISOString();
        await tsm.updateTaskState(task.id, "EXECUTING", "COMPLETED", {
          completed_at: done,
          result: resultPayload,
        });

        const duration_ms = Date.now() - t0;
        await metrics.recordTaskCompletion(task, {
          ok: true,
          duration_ms,
          agent: route.agentType,
        });

        if (shouldNotifyDiscord()) {
          await this.discord.notifyTaskComplete(task, {
            ok: true,
            duration_ms,
            agent: route.agentType,
          });
        }
        processed += 1;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        errors.push(`${task.id}: ${msg}`);
        logHermesEvent("hermes_task_error", { task_id: task.id, message: msg });
        const latest = await tsm.getTask(task.id);
        const st = latest?.state;
        const failPatch = {
          result: { error: msg } as Record<string, unknown>,
          completed_at: new Date().toISOString(),
        };
        try {
          if (st === "EXECUTING") {
            await tsm.updateTaskState(task.id, "EXECUTING", "FAILED", failPatch);
          } else if (st === "ROUTED") {
            await tsm.updateTaskState(task.id, "ROUTED", "FAILED", failPatch);
          } else if (st === "PENDING") {
            await tsm.updateTaskState(task.id, "PENDING", "FAILED", failPatch);
          }
        } catch {
          // best-effort: estado intermedio desconocido
        }
        if (shouldNotifyDiscord()) {
          await this.discord.notifyTaskFailed(task, msg);
        }
      }
    }

    logHermesEvent("hermes_tick_complete", { processed, error_count: errors.length });
    return { processed, errors };
  }
}

export function createHermesOrchestrator(): HermesOrchestrator {
  return new HermesOrchestrator();
}

```

## apps/orchestrator/src/lib/notebooklm-client.ts

```typescript
import { createHash } from 'node:crypto';
import { basename } from 'node:path';

import { executeNotebookLM } from '@intcloudsysops/notebooklm-agent';
import type { NotebookDocument, NotebookQueryResponse } from '@intcloudsysops/types';

export type { NotebookQueryResponse };

import { getNotebookLmCache, setNotebookLmCache } from './notebooklm-cache.js';

const QUERY_TIMEOUT_MS = 30_000;
const MAX_RETRIES = 2;

function defaultTenantSlug(): string {
  return process.env.NOTEBOOKLM_DEFAULT_TENANT_SLUG?.trim() || 'platform';
}

function defaultNotebookId(): string | undefined {
  const id = process.env.NOTEBOOKLM_NOTEBOOK_ID?.trim();
  return id && id.length > 0 ? id : undefined;
}

function enabled(): boolean {
  return process.env.NOTEBOOKLM_ENABLED?.trim().toLowerCase() === 'true';
}

function cacheKey(notebookId: string, question: string, context?: string): string {
  return createHash('sha256')
    .update(`${notebookId}|${question}|${context ?? ''}`)
    .digest('hex');
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      p,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error(`NotebookLM timeout after ${String(ms)}ms`));
        }, ms);
      }),
    ]);
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

/**
 * Cliente NotebookLM para Hermes: delega en `executeNotebookLM` → `notebooklm-py` (ADR-014).
 * No existe API REST pública estable de Google; no usar URLs inventadas.
 */
export class NotebookLMClient {
  public isAvailable(): boolean {
    return enabled() && defaultNotebookId() !== undefined;
  }

  public async queryNotebook(question: string, context?: string): Promise<NotebookQueryResponse> {
    const notebookId = defaultNotebookId();
    if (!notebookId) {
      return {
        answer: '',
        sources: [],
        confidence: 0,
        cached: false,
      };
    }

    const key = cacheKey(notebookId, question, context);
    const hit = getNotebookLmCache<NotebookQueryResponse>(key);
    if (hit) {
      return { ...hit, cached: true };
    }

    const fullQ =
      context && context.length > 0 ? `${question}\n\nContexto adicional:\n${context}` : question;

    let lastErr = '';
    const t0 = Date.now();
    for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
      try {
        const result = await withTimeout(
          executeNotebookLM({
            action: 'ask',
            tenant_slug: defaultTenantSlug(),
            notebook_id: notebookId,
            question: fullQ,
          }),
          QUERY_TIMEOUT_MS
        );

        if (!result.success || result.answer === undefined) {
          lastErr = result.error ?? 'ask failed';
          continue;
        }

        const out: NotebookQueryResponse = {
          answer: result.answer,
          sources: [],
          confidence: 0.85,
          latency_ms: Date.now() - t0,
          cached: false,
        };
        setNotebookLmCache(key, out);
        return out;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
      }
    }

    return {
      answer: '',
      sources: [],
      confidence: 0,
      cached: false,
      latency_ms: Date.now() - t0,
    };
  }

  public async uploadDocument(filePath: string, content: string): Promise<string> {
    const notebookId = defaultNotebookId();
    if (!notebookId) {
      throw new Error('NOTEBOOKLM_NOTEBOOK_ID is not set');
    }
    const title = basename(filePath) || 'document.md';
    const result = await executeNotebookLM({
      action: 'add_source',
      tenant_slug: defaultTenantSlug(),
      notebook_id: notebookId,
      source_type: 'text',
      title,
      text: content,
    });
    if (!result.success) {
      throw new Error(result.error ?? 'add_source failed');
    }
    return `text:${title}`;
  }

  /**
   * notebooklm-py no expone listado de fuentes vía el cliente actual; devuelve [] de forma segura.
   */
  public async listDocuments(): Promise<NotebookDocument[]> {
    return [];
  }

  public async summarize(_docId: string): Promise<{ summary: string }> {
    const q = await this.queryNotebook(
      'Resume el documento indicado por el operador en una lista de viñetas (modo Hermes sync).'
    );
    return { summary: q.answer || '(sin respuesta NotebookLM)' };
  }
}

```

