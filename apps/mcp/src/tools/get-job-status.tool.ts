/**
 * Consulta estado de un job BullMQ en la cola `openclaw` (p. ej. tras `run_agent_task`).
 */

import { Queue } from 'bullmq';
import { z } from 'zod';

import { getOpenclawQueueConnection } from '../lib/redis-queue.js';
import type { ToolDefinition } from '../types/index.js';

const getJobStatusInputSchema = z.object({
  jobId: z.string().min(1),
});

export type GetJobStatusInput = z.infer<typeof getJobStatusInputSchema>;

export type GetJobStatusOutput =
  | {
      success: true;
      found: true;
      id: string;
      /** Estado BullMQ: waiting, active, completed, failed, delayed, etc. */
      state: string;
      /** 0–100 cuando BullMQ expone progreso numérico; si no, 0. */
      progress: number;
      /** Valor devuelto por el worker al completar (p. ej. resultado `processIntent` / OAR). */
      returnvalue: unknown;
      failedReason: string | null;
      processedOn: number | null;
      name: string | null;
    }
  | {
      success: true;
      found: false;
      jobId: string;
      message: string;
    }
  | {
      success: false;
      error: string;
    };

function normalizeProgress(progress: unknown): number {
  if (typeof progress === 'number' && Number.isFinite(progress)) {
    return Math.min(100, Math.max(0, progress));
  }
  return 0;
}

export const getJobStatusTool: ToolDefinition<GetJobStatusInput, GetJobStatusOutput> = {
  name: 'get_job_status',
  description:
    'Consulta el estado de un trabajo de agente disparado previamente. Devuelve el progreso, resultado final o errores.',
  inputSchema: getJobStatusInputSchema,
  handler: async (input): Promise<GetJobStatusOutput> => {
    const conn = getOpenclawQueueConnection();
    if (conn === null) {
      return {
        success: false,
        error: 'Redis no configurado (REDIS_URL). No se puede consultar el estado del job.',
      };
    }

    const queue = new Queue('openclaw', { connection: conn });
    try {
      const job = await queue.getJob(input.jobId);
      if (job === undefined) {
        return {
          success: true,
          found: false,
          jobId: input.jobId,
          message:
            'No existe un job con ese id en la cola openclaw (o ya expiró por removeOnComplete/removeOnFail).',
        };
      }

      const state = await job.getState();
      return {
        success: true,
        found: true,
        id: String(job.id ?? ''),
        state,
        progress: normalizeProgress(job.progress),
        returnvalue: job.returnvalue ?? null,
        failedReason: job.failedReason ?? null,
        processedOn: job.processedOn ?? null,
        name: job.name ?? null,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        success: false,
        error: `Error al consultar Redis/BullMQ: ${msg}`,
      };
    } finally {
      await queue.close().catch(() => undefined);
    }
  },
};
