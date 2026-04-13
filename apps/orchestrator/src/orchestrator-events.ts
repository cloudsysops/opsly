/**
 * Orchestrator Events — registro centralizado de eventos del orquestador.
 *
 * Eventos registrados:
 * - job.enqueue: Job añadido a la cola
 * - job.start: Job iniciado por worker
 * - job.complete: Job completado exitosamente
 * - job.fail: Job falló después de reintentos
 * - worker.start: Worker iniciado
 * - worker.stop: Worker detenido
 * - worker.error: Error en worker
 * - queue.metrics: Métricas de la cola (cada 60s)
 * - system.startup: Orchestrator iniciado
 * - system.shutdown: Orchestrator detenido
 */

import type { OrchestratorJob } from './types.js';
import {
  orchestratorQueue,
  agentClassifierQueue,
  hermesOrchestrationQueue,
} from './queue.js';

interface Event {
  event: string;
  timestamp: string;
  service: string;
  [key: string]: unknown;
}

function emit(event: Event): void {
  const line = JSON.stringify(event);
  process.stdout.write(`${line}\n`);
}

export function logSystemStartup(mode: string, workers: string[]): void {
  emit({
    event: 'system.startup',
    timestamp: new Date().toISOString(),
    service: 'orchestrator',
    mode,
    workers,
  });
}

export function logSystemShutdown(workers: string[]): void {
  emit({
    event: 'system.shutdown',
    timestamp: new Date().toISOString(),
    service: 'orchestrator',
    workers,
  });
}

export function logWorkerStart(workerName: string, concurrency: number): void {
  emit({
    event: 'worker.start',
    timestamp: new Date().toISOString(),
    service: 'orchestrator',
    worker_name: workerName,
    concurrency,
  });
}

export function logWorkerStop(workerName: string, reason?: string): void {
  emit({
    event: 'worker.stop',
    timestamp: new Date().toISOString(),
    service: 'orchestrator',
    worker_name: workerName,
    reason,
  });
}

export function logWorkerError(workerName: string, error: string, jobId?: string): void {
  emit({
    event: 'worker.error',
    timestamp: new Date().toISOString(),
    service: 'orchestrator',
    worker_name: workerName,
    error,
    job_id: jobId,
  });
}

export function logJobEnqueue(job: OrchestratorJob): void {
  emit({
    event: 'job.enqueue',
    timestamp: new Date().toISOString(),
    service: 'orchestrator',
    job_type: job.type,
    task_id: job.taskId,
    tenant_slug: job.tenant_slug,
    job_id: job.idempotency_key,
  });
}

export function logJobStart(jobType: string, jobId: string, workerName: string): void {
  emit({
    event: 'job.start',
    timestamp: new Date().toISOString(),
    service: 'orchestrator',
    job_type: jobType,
    job_id: jobId,
    worker_name: workerName,
  });
}

export function logJobComplete(
  jobType: string,
  jobId: string,
  workerName: string,
  durationMs: number
): void {
  emit({
    event: 'job.complete',
    timestamp: new Date().toISOString(),
    service: 'orchestrator',
    job_type: jobType,
    job_id: jobId,
    worker_name: workerName,
    duration_ms: durationMs,
  });
}

export function logJobFail(
  jobType: string,
  jobId: string,
  workerName: string,
  error: string,
  durationMs: number
): void {
  emit({
    event: 'job.fail',
    timestamp: new Date().toISOString(),
    service: 'orchestrator',
    job_type: jobType,
    job_id: jobId,
    worker_name: workerName,
    error,
    duration_ms: durationMs,
  });
}

/**
 * Recolecta métricas de las colas BullMQ.
 */
export interface QueueMetrics {
  queue_name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export async function getQueueMetrics(): Promise<QueueMetrics[]> {
  const queues = [orchestratorQueue, agentClassifierQueue, hermesOrchestrationQueue];
  const metrics: QueueMetrics[] = [];

  for (const queue of queues) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    metrics.push({
      queue_name: queue.name,
      waiting: waiting || 0,
      active: active || 0,
      completed: completed || 0,
      failed: failed || 0,
      delayed: delayed || 0,
    });
  }

  return metrics;
}

export function logQueueMetrics(): void {
  getQueueMetrics()
    .then((metrics) => {
      emit({
        event: 'queue.metrics',
        timestamp: new Date().toISOString(),
        service: 'orchestrator',
        queues: metrics,
      });
    })
    .catch(() => {
      // no-op
    });
}
