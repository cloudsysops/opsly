/**
 * Super Orchestrator Worker
 *
 * Worker BullMQ que ejecuta tareas del Super Orchestrator v2
 * jobs: 'super_orchestrator'
 */

import { Job } from 'bullmq';
import { createWorker } from './create-worker.js';
import { setJobState } from '../state/store.js';
import { superOrchestratorIntegration } from '../super-orchestrator-integration.js';

interface SuperOrchestratorJobData {
  prompt: string;
  task_type?: string;
  intent?: string;
  context?: Record<string, unknown>;
  capabilities?: string[];
  max_latency_ms?: number;
  tenant_slug?: string;
  initiated_by?: string;
}

export function startSuperOrchestratorWorker(connection: object) {
  return createWorker({
    queueName: 'super_orchestrator',
    workerName: 'super_orchestrator',
    concurrencyKey: 'super_orchestrator',
    connection,
    workerOptions: { limiter: { max: 10, duration: 60000 } },
    processFn: async (job: Job) => {
      const data = job.data as SuperOrchestratorJobData;
      const { prompt, task_type, context, capabilities, max_latency_ms } = data;
      const tenantSlug = data.tenant_slug || 'opsly';
      const initiatedBy = data.initiated_by || 'system';

      await setJobState(job.id!, {
        status: 'running',
        type: 'super_orchestrator',
        tenant_slug: tenantSlug,
        request_id: job.id!,
        started_at: new Date().toISOString()
      });

      try {
        await superOrchestratorIntegration.initialize();

        const result = await superOrchestratorIntegration.executeTask(
          {
            prompt,
            task_type,
            intent: data.intent,
            context,
            capabilities,
            max_latency_ms
          },
          tenantSlug,
          initiatedBy
        );

        await setJobState(job.id!, {
          status: result.success ? 'completed' : 'failed',
          completed_at: new Date().toISOString(),
          result: result.success ? {
            provider: result.provider,
            output: result.output?.substring(0, 500),
            latency_ms: result.latency_ms
          } : undefined,
          error: result.error
        });

        return {
          success: result.success,
          provider: result.provider,
          output: result.output,
          latency_ms: result.latency_ms,
          cost: result.cost,
          commit: result.commit,
          n8n: result.n8n
        };
      } catch (error) {
        await setJobState(job.id!, {
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: String(error)
        });

        throw error;
      }
    },
  });
}