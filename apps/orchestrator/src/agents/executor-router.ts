/**
 * ExecutorRouter — Enruta AutonomousTask al executor correcto
 * Cursor (IDE) → código/features | ClaudeCode (API) → análisis/docs | Shell → infra/scripts
 */

import { orchestratorQueue } from "../queue.js";
import { type AutonomousTask } from "./autonomous-tasks.js";

type Executor = "cursor" | "claude-code";

function normalizeExecutor(
  executor: AutonomousTask["executor"] | AutonomousTask["executorFallback"] | undefined,
): Executor {
  return executor === "claude-code" ? "claude-code" : "cursor";
}

/**
 * Devuelve true si el executor está disponible según env vars.
 */
function isExecutorAvailable(executor: Executor): boolean {
  switch (executor) {
    case "cursor":
      return process.env.CURSOR_AVAILABLE === "true";
    case "claude-code":
      return Boolean(process.env.ANTHROPIC_API_KEY);
  }
}

/**
 * Resuelve qué executor usar, respetando el fallback configurado.
 */
function resolveExecutor(task: AutonomousTask): Executor {
  const preferred = normalizeExecutor(task.executor);
  if (isExecutorAvailable(preferred)) return preferred;

  const fallback = normalizeExecutor(task.executorFallback);
  if (isExecutorAvailable(fallback)) {
    return fallback;
  }
  // Último recurso: claude-code si tiene API key, cursor en caso contrario
  if (process.env.ANTHROPIC_API_KEY) return "claude-code";
  return "cursor";
}

/**
 * Construye el payload BullMQ según el executor destino.
 */
function buildPayload(task: AutonomousTask, executor: Executor): Record<string, unknown> {
  const base = {
    task_id: task.id,
    title: task.title,
    description: task.description,
    acceptance_criteria: task.acceptanceCriteria,
    tenant_slug: "platform",
    triggered_by: "executor-router",
  };

  if (executor === "cursor") {
    return {
      payload: {
        task: task.title,
        commands: [
          task.description.trim(),
          ...task.acceptanceCriteria.map((c) => `✓ ${c}`),
          `Commit en rama maia/${task.id} y abre PR.`,
        ],
      },
    };
  }

  return base;
}

export class ExecutorRouter {
  /**
   * Enruta una tarea autónoma al executor correcto.
   * Retorna el job BullMQ encolado.
   */
  static async route(task: AutonomousTask): Promise<{ executor: Executor; jobId: string | undefined }> {
    const executor = resolveExecutor(task);
    const jobName = executor === "cursor" ? "cursor" : "claude-code";

    const payload = buildPayload(task, executor);
    const job = await orchestratorQueue.add(jobName, payload, {
      jobId: `${task.id}-${executor}-${Date.now()}`,
    });

    return { executor, jobId: job.id };
  }

  /**
   * Enruta múltiples tareas en paralelo (respeta concurrencia de cada worker).
   */
  static async routeAll(tasks: AutonomousTask[]): Promise<Array<{ taskId: string; executor: Executor; jobId: string | undefined }>> {
    const results = await Promise.all(
      tasks.map(async (task) => {
        const { executor, jobId } = await ExecutorRouter.route(task);
        return { taskId: task.id, executor, jobId };
      }),
    );
    return results;
  }
}
