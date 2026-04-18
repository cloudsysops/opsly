/**
 * Encola `oar_react` en la cola BullMQ `openclaw` para ejecución por IntentDispatchWorker.
 */

import { Queue } from "bullmq";
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { getOpenclawQueueConnection } from "../lib/redis-queue.js";
import type { ToolDefinition } from "../types/index.js";

const runAgentTaskInputSchema = z.object({
  tenant_slug: z.string().min(1),
  prompt: z.string().min(1),
  mode: z.string().default("developer"),
  max_steps: z.number().int().positive().max(100).default(50),
});

export type RunAgentTaskInput = z.infer<typeof runAgentTaskInputSchema>;

export type RunAgentTaskOutput =
  | { success: true; jobId: string; message: string }
  | { success: false; error: string };

export const runAgentTaskTool: ToolDefinition<RunAgentTaskInput, RunAgentTaskOutput> = {
  name: "run_agent_task",
  description:
    "Inicia una tarea de agente usando el Opsly Agentic Runtime (OAR) en modo ReAct. El agente pensará y actuará hasta resolver la tarea.",
  inputSchema: runAgentTaskInputSchema,
  handler: async (input): Promise<RunAgentTaskOutput> => {
    const conn = getOpenclawQueueConnection();
    if (conn === null) {
      return {
        success: false,
        error: "Redis no configurado (REDIS_URL). No se puede encolar la tarea de agente.",
      };
    }

    const requestId = randomUUID();

    const orchestratorJob = {
      type: "intent_dispatch" as const,
      payload: {
        intent_request: {
          intent: "oar_react" as const,
          tenant_slug: input.tenant_slug,
          context: {
            prompt: input.prompt,
            mode: input.mode,
            max_steps: input.max_steps,
          },
          initiated_by: "claude" as const,
          request_id: requestId,
        },
      },
      tenant_slug: input.tenant_slug,
      initiated_by: "claude" as const,
      request_id: requestId,
    };

    const queue = new Queue("openclaw", { connection: conn });
    try {
      const job = await queue.add("intent_dispatch", orchestratorJob, {
        removeOnComplete: 1000,
        removeOnFail: 500,
      });
      return {
        success: true,
        jobId: String(job.id ?? ""),
        message: "Agente iniciado. Usa get_job_status para seguir progreso.",
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    } finally {
      await queue.close().catch(() => undefined);
    }
  },
};
