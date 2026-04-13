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

  private enricher: ContextEnricher | null = createContextEnricher();

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
