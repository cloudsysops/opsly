/**
 * SwarmOps — HiveWorker: Worker Bee de la colmena.
 *
 * Procesa jobs `hive_worker_bee` encolados por la QueenBee.
 * Cada Worker Bee ejecuta una Subtask según su BotRole:
 *  - researcher  → invoca el ResearchWorker (LLM Gateway /v1/text con task_type=analyze)
 *  - coder       → notificación + stub para integración con CursorWorker
 *  - tester      → notificación + stub
 *  - deployer    → notificación + stub
 *  - doc-writer  → notificación + stub
 *  - security    → notificación + stub
 *
 * Actualiza el HiveState en Redis al completar/fallar cada subtarea.
 * Publica mensajes feromonales de resultado.
 */

import { Worker, type Job } from 'bullmq';
import { createClient } from 'redis';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';
import { updateSubtaskStatus, updateHiveTaskStatus, getHiveTask } from '../hive/hive-state.js';
import { publishPheromone } from '../hive/pheromone-channel.js';
import type { BotRole, HiveWorkerBeePayload } from '../hive/types.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DEFAULT_GATEWAY = 'http://127.0.0.1:3010';

function gatewayBaseUrl(): string {
  const raw =
    process.env.LLM_GATEWAY_URL ?? process.env.ORCHESTRATOR_LLM_GATEWAY_URL ?? DEFAULT_GATEWAY;
  return raw.replace(/\/$/, '');
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

/** Ejecuta la lógica específica de cada rol de bot. */
async function executeBotRole(
  role: BotRole,
  subtaskDescription: string,
  tenantSlug: string,
  requestId: string
): Promise<{ summary: string; cost_usd: number }> {
  switch (role) {
    case 'researcher': {
      // Researcher llama al LLM Gateway para análisis
      const url = `${gatewayBaseUrl()}/v1/text`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          request_id: requestId,
          task_type: 'analyze',
          prompt: subtaskDescription,
        }),
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) {
        throw new Error(`LLM Gateway HTTP ${res.status} for researcher`);
      }
      const json = (await res.json()) as TextGatewayResponse;
      return {
        summary: typeof json.content === 'string' ? json.content.slice(0, 500) : 'researcher done',
        cost_usd: json.llm?.cost_usd ?? 0,
      };
    }

    case 'coder':
      // Stub: en producción integra con CursorWorker / LLM Gateway /v1/text con task_type=generate
      return { summary: `[coder] Task stub for: ${subtaskDescription.slice(0, 100)}`, cost_usd: 0 };

    case 'tester':
      return { summary: `[tester] Task stub for: ${subtaskDescription.slice(0, 100)}`, cost_usd: 0 };

    case 'deployer':
      return { summary: `[deployer] Task stub for: ${subtaskDescription.slice(0, 100)}`, cost_usd: 0 };

    case 'doc-writer':
      return { summary: `[doc-writer] Task stub for: ${subtaskDescription.slice(0, 100)}`, cost_usd: 0 };

    case 'security':
      return { summary: `[security] Task stub for: ${subtaskDescription.slice(0, 100)}`, cost_usd: 0 };

    case 'queen':
      return { summary: '[queen] No direct execution', cost_usd: 0 };
  }
}

/** Verifica si todas las subtareas de una HiveTask están completadas para marcar la tarea. */
async function maybeCompleteHiveTask(hiveTaskId: string): Promise<void> {
  const task = await getHiveTask(hiveTaskId);
  if (!task || task.status === 'completed' || task.status === 'failed') {
    return;
  }
  const allDone = task.subtasks.every(
    (s) => s.status === 'completed' || s.status === 'failed'
  );
  const anyFailed = task.subtasks.some((s) => s.status === 'failed');
  if (allDone) {
    await updateHiveTaskStatus(hiveTaskId, anyFailed ? 'failed' : 'completed');
  }
}

export interface HiveWorkerOptions {
  /** BullMQ/ioredis connection options. */
  connection: object;
  /**
   * Shared Redis client used for pheromone pub/sub.
   * When provided, the worker will NOT create its own connection per job,
   * avoiding repeated connect/disconnect overhead.
   */
  pubClient?: ReturnType<typeof createClient>;
}

export function startHiveWorker({ connection, pubClient: sharedPubClient }: HiveWorkerOptions): Worker {
  const concurrency = getWorkerConcurrency('hive');

  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'hive_worker_bee') {
        return;
      }

      const t0 = Date.now();
      logWorkerLifecycle('start', 'hive', job);

      const data = job.data as { payload: HiveWorkerBeePayload; tenant_slug?: string; request_id?: string };
      const payload = data.payload;

      const { hive_task_id, subtask_id, subtask_description, bot_role, objective } = payload;
      const tenantSlug = (data.tenant_slug ?? '').trim();
      const requestId = data.request_id ?? job.id ?? 'unknown';

      if (!hive_task_id || !subtask_id || !bot_role) {
        throw new Error('hive_worker_bee: hive_task_id, subtask_id and bot_role are required');
      }

      // Usar cliente compartido si está disponible; crear uno temporal si no lo hay.
      let ownedClient: ReturnType<typeof createClient> | null = null;
      const pubClient = sharedPubClient ?? (() => {
        ownedClient = createClient({
          url: REDIS_URL,
          password: process.env.REDIS_PASSWORD,
        });
        return ownedClient;
      })();
      if (!pubClient.isOpen) {
        await pubClient.connect();
      }

      try {
        // Notificar inicio
        await publishPheromone(pubClient, hive_task_id, {
          from: `worker-${bot_role}`,
          to: 'broadcast',
          type: 'finding',
          content: `Bot [${bot_role}] starting subtask: ${subtask_description.slice(0, 100)}`,
          metadata: { subtask_id, objective: objective.slice(0, 100) },
        });

        const result = await executeBotRole(bot_role, subtask_description, tenantSlug, requestId);

        // Actualizar subtarea como completada
        await updateSubtaskStatus(hive_task_id, subtask_id, 'completed', {
          summary: result.summary,
          cost_usd: result.cost_usd,
        });

        // Notificar completado
        await publishPheromone(pubClient, hive_task_id, {
          from: `worker-${bot_role}`,
          to: 'broadcast',
          type: 'task_complete',
          content: `Bot [${bot_role}] completed subtask`,
          metadata: { subtask_id, summary_preview: result.summary.slice(0, 100) },
        });

        // Verificar si toda la HiveTask terminó
        await maybeCompleteHiveTask(hive_task_id);

        const duration = Date.now() - t0;
        logWorkerLifecycle('complete', 'hive', job, { duration_ms: duration });

        return {
          success: true,
          hive_task_id,
          subtask_id,
          bot_role,
          summary: result.summary,
          cost_usd: result.cost_usd,
          duration_ms: duration,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await updateSubtaskStatus(hive_task_id, subtask_id, 'failed', { error: msg });
        await publishPheromone(pubClient, hive_task_id, {
          from: `worker-${bot_role}`,
          to: 'broadcast',
          type: 'error',
          content: `Bot [${bot_role}] failed: ${msg.slice(0, 200)}`,
          metadata: { subtask_id },
        });
        await maybeCompleteHiveTask(hive_task_id);
        logWorkerLifecycle('fail', 'hive', job, { duration_ms: Date.now() - t0, error: msg });
        throw err;
      } finally {
        // Solo cerrar conexión si la creamos nosotros (no la compartida)
        if (ownedClient !== null && (ownedClient as ReturnType<typeof createClient>).isOpen) {
          await (ownedClient as ReturnType<typeof createClient>).quit();
        }
      }
    },
    { connection, concurrency }
  );
}
