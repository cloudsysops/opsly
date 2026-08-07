/**
 * Task Dispatch - Adaptador de entrada multi-fuente para orchestrator-integration.ts
 *
 * Gap real detectado: processOrchestratorJob() ya sabe ejecutar un job,
 * pero no hay forma de generarlo desde chat/API/webhook. Este módulo NO
 * reemplaza processOrchestratorJob; solo construye OrchestratorJobRequest
 * a partir de distintos orígenes y lo delega.
 */

import { randomUUID } from 'node:crypto';
import {
  processOrchestratorJob,
  type OrchestratorJobRequest,
  type OrchestratorJobResult,
} from './orchestrator-integration';

export type DispatchSource = 'chat' | 'cli' | 'webhook' | 'api' | 'dashboard';

export interface DispatchInput {
  source: DispatchSource;
  /** Texto libre (chat) o descripción de tarea (api/dashboard) */
  task: string;
  tenantId?: string;
  budget?: 'low' | 'medium' | 'high';
  timeout?: number;
  metadata?: Record<string, unknown>;
}

export interface DispatchOutcome {
  dispatchId: string;
  source: DispatchSource;
  jobIds: string[];
  results: OrchestratorJobResult[];
}

const TASK_ID_PATTERN = /[A-Z][A-Z0-9]*-\d+(?:\.\d+)?/g;

/**
 * Extrae referencias de tarea de un mensaje en lenguaje natural.
 * Ej: "Ejecuta PESKIDS-1.1 a PESKIDS-1.4" -> ["PESKIDS-1.1", "PESKIDS-1.4"]
 * No resuelve el contenido de la tarea (no existe un task registry en el
 * repo); el texto completo del mensaje se pasa como prompt al worker.
 */
export function extractTaskReferences(message: string): string[] {
  return Array.from(new Set(message.match(TASK_ID_PATTERN) ?? []));
}

/**
 * Dispatch desde un único input ya normalizado (usado por api/dashboard/webhook).
 */
export async function dispatchTask(input: DispatchInput): Promise<DispatchOutcome> {
  const dispatchId = `dispatch_${Date.now()}_${randomUUID().slice(0, 8)}`;

  const jobRequest: OrchestratorJobRequest = {
    jobId: `job_${randomUUID()}`,
    tenantId: input.tenantId || 'peskids',
    task: input.task,
    budget: input.budget || 'medium',
    timeout: input.timeout,
    context: JSON.stringify({ source: input.source, ...input.metadata }),
  };

  const result = await processOrchestratorJob(jobRequest);

  return {
    dispatchId,
    source: input.source,
    jobIds: [jobRequest.jobId],
    results: [result],
  };
}

/**
 * Dispatch desde un mensaje de chat en lenguaje natural.
 * Extrae referencias de tarea solo para trazabilidad; el mensaje completo
 * se usa como prompt (no hay task registry para resolver PESKIDS-1.1 a datos).
 */
export async function dispatchFromChat(
  message: string,
  options: Omit<DispatchInput, 'source' | 'task'> = {}
): Promise<DispatchOutcome & { taskReferences: string[] }> {
  const taskReferences = extractTaskReferences(message);

  const outcome = await dispatchTask({
    source: 'chat',
    task: message,
    ...options,
  });

  return { ...outcome, taskReferences };
}

/**
 * Dispatch desde webhook (payload JSON externo).
 */
export async function dispatchFromWebhook(
  payload: Record<string, unknown>
): Promise<DispatchOutcome> {
  const task = typeof payload.task === 'string' ? payload.task : JSON.stringify(payload.task);

  return dispatchTask({
    source: 'webhook',
    task,
    tenantId: typeof payload.tenantId === 'string' ? payload.tenantId : undefined,
    budget: (payload.budget as DispatchInput['budget']) || 'medium',
    metadata: { webhookPayload: payload },
  });
}

export default { dispatchTask, dispatchFromChat, dispatchFromWebhook, extractTaskReferences };
