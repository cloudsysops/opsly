/**
 * Orchestrator Integration - Conecta Local-First con BullMQ
 * Expone endpoint interno para que el orchestrator use workers locales
 */

import { selectWorker, selectWorkerWithFallback, WorkerType } from './worker-selector';
import { executeLocalAgent, executeWithRetry } from './local-executor';

export interface OrchestratorJobRequest {
  jobId: string;
  tenantId: string;
  task: string;
  budget?: 'low' | 'medium' | 'high';
  timeout?: number;
  context?: string;
}

export interface OrchestratorJobResult {
  jobId: string;
  success: boolean;
  output?: string;
  error?: string;
  workerType: WorkerType;
  executionTime: number;
  tokensUsed?: number;
}

/**
 * Procesar un job del orchestrator usando Local-First
 */
export async function processOrchestratorJob(
  request: OrchestratorJobRequest
): Promise<OrchestratorJobResult> {
  const startTime = Date.now();

  try {
    // 1. Seleccionar mejor worker
    const { worker, result } = await selectWorkerWithFallback({
      budget: request.budget || 'medium',
    });

    console.log(`[Local-First] Job ${request.jobId}: selected ${worker.type} - ${result.reason}`);

    // 2. Ejecutar en el worker seleccionado
    let executionResult;

    if (worker.type === 'local') {
      executionResult = await executeWithRetry({
        prompt: request.task,
        agent: 'cursor',
        timeout: request.timeout || 60000,
        budget: request.budget,
      });
    } else if (worker.type === 'ollama') {
      executionResult = await executeWithRetry({
        prompt: request.task,
        agent: 'ollama',
        timeout: request.timeout || 60000,
        budget: request.budget,
      });
    } else {
      // Fallback to remote/VPS - this would call the orchestrator's existing path
      return {
        jobId: request.jobId,
        success: false,
        error: `Worker type ${worker.type} requires orchestrator fallback`,
        workerType: worker.type,
        executionTime: Date.now() - startTime,
      };
    }

    return {
      jobId: request.jobId,
      success: executionResult.success,
      output: executionResult.output,
      error: executionResult.error,
      workerType: worker.type,
      executionTime: Date.now() - startTime,
      tokensUsed: executionResult.tokens,
    };
  } catch (error: any) {
    return {
      jobId: request.jobId,
      success: false,
      error: error.message || 'Unknown error',
      workerType: 'remote',
      executionTime: Date.now() - startTime,
    };
  }
}

/**
 * Endpoint interno para el orchestrator
 * POST /internal/local-first/execute
 */
export async function handleInternalLocalFirstRequest(
  body: OrchestratorJobRequest
): Promise<OrchestratorJobResult> {
  return processOrchestratorJob(body);
}

/**
 * Health check para el orchestrator
 */
export async function getLocalFirstStatus() {
  const { detectEnvironment, healthCheck } = await import('./environment-detector');

  const [env, health] = await Promise.all([detectEnvironment(), healthCheck()]);

  return {
    available: health.healthy,
    localAgents: health.agentsAvailable,
    ollamaRunning: env.ollama.running,
    ollamaModels: env.ollama.models,
    recommendation: env.recommendedAgent,
    health: {
      cpuOk: health.cpuOk,
      memoryOk: health.memoryOk,
      diskOk: health.diskOk,
      ollamaOk: health.ollamaOk,
    },
  };
}

export default {
  processOrchestratorJob,
  handleInternalLocalFirstRequest,
  getLocalFirstStatus,
};
