/**
 * ExecutorRouter — Enruta AutonomousTask al executor correcto
 * Cursor (IDE) → código/features | ClaudeCode (API) → análisis/docs | Shell → infra/scripts
 */

import { orchestratorQueue } from "../queue.js";
import { type AutonomousTask } from "./autonomous-tasks.js";

type Executor = "cursor" | "claude-code" | "shell";

/**
 * Devuelve true si el executor está disponible según env vars.
 */
function isExecutorAvailable(executor: Executor): boolean {
  switch (executor) {
    case "cursor":
      return process.env.CURSOR_AVAILABLE === "true";
    case "claude-code":
      return Boolean(process.env.ANTHROPIC_API_KEY);
    case "shell":
      return true; // siempre disponible
  }
}

/**
 * Resuelve qué executor usar, respetando el fallback configurado.
 */
function resolveExecutor(task: AutonomousTask): Executor {
  if (isExecutorAvailable(task.executor)) return task.executor;
  if (task.executorFallback && isExecutorAvailable(task.executorFallback)) {
    return task.executorFallback;
  }
  // Último recurso: claude-code si tiene API key, shell en caso contrario
  if (process.env.ANTHROPIC_API_KEY) return "claude-code";
  return "shell";
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

  if (executor === "claude-code") {
    return base;
  }

  // shell — los acceptanceCriteria son los comandos bash
  return {
    payload: {
      task: task.title,
      commands: task.acceptanceCriteria,
    },
  };
}

export class ExecutorRouter {
  /**
   * Enruta una tarea autónoma al executor correcto.
   * Retorna el job BullMQ encolado.
   */
  static async route(task: AutonomousTask): Promise<{ executor: Executor; jobId: string | undefined }> {
    const executor = resolveExecutor(task);
    const jobName = executor === "cursor" ? "cursor"
      : executor === "claude-code" ? "claude-code"
      : "shell";

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
