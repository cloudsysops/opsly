/**
 * Super Orchestrator Worker
 * 
 * Worker BullMQ que ejecuta tareas del Super Orchestrator v2
 * jobs: 'super_orchestrator'
 */

import { Worker, Job } from 'bullmq';
import { connection } from '../queue.js';
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

const WORKER_CONCURRENCY = 3;

export function startSuperOrchestratorWorker(): Worker {
  const worker = new Worker<SuperOrchestratorJobData>(
    'super_orchestrator',
    async (job: Job<SuperOrchestratorJobData>) => {
      const { prompt, task_type, context, capabilities, max_latency_ms } = job.data;
      const tenantSlug = job.data.tenant_slug || 'opsly';
      const initiatedBy = job.data.initiated_by || 'system';
      
      console.log(`[super-orchestrator-worker] Processing job ${job.id}: ${prompt.substring(0, 50)}...`);
      
      // Update state to processing
      await setJobState(job.id!, {
        status: 'running',
        type: 'super_orchestrator',
        tenant_slug: tenantSlug,
        request_id: job.id!,
        started_at: new Date().toISOString()
      });
      
      try {
        // Initialize if needed
        await superOrchestratorIntegration.initialize();
        
        // Execute task
        const result = await superOrchestratorIntegration.executeTask(
          {
            prompt,
            task_type,
            intent: job.data.intent,
            context,
            capabilities,
            max_latency_ms
          },
          tenantSlug,
          initiatedBy
        );
        
        // Update state to completed
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
        console.error(`[super-orchestrator-worker] Job ${job.id} failed:`, error);
        
        // Update state to failed
        await setJobState(job.id!, {
          status: 'failed',
          completed_at: new Date().toISOString(),
          error: String(error)
        });
        
        throw error;
      }
    },
    {
      connection,
      concurrency: WORKER_CONCURRENCY,
      limiter: {
        max: 10,
        duration: 60000
      }
    }
  );
  
  worker.on('completed', (job) => {
    console.log(`[super-orchestrator-worker] Job ${job.id} completed`);
  });
  
  worker.on('failed', (job, error) => {
    console.error(`[super-orchestrator-worker] Job ${job?.id} failed:`, error.message);
  });
  
  worker.on('error', (error) => {
    console.error(`[super-orchestrator-worker] Worker error:`, error);
  });
  
  console.log(
    `[super-orchestrator-worker] Started with concurrency ${WORKER_CONCURRENCY}`
  );
  
  return worker;
}