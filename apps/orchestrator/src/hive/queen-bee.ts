/**
 * SwarmOps — QueenBee: director de la colmena de bots.
 *
 * Responsabilidades:
 *  1. Recibir un objetivo de alto nivel.
 *  2. Descomponerlo en subtareas especializadas (una por rol de bot).
 *  3. Registrar la HiveTask en el HiveState (Redis).
 *  4. Despachar jobs BullMQ para cada Worker Bee.
 *  5. Publicar mensajes ferumonales de coordinación.
 */

import { randomUUID } from 'node:crypto';
import type { Queue } from 'bullmq';
import type {
  Bot,
  BotRole,
  HiveDispatchPayload,
  HiveDispatchResult,
  HiveTask,
  Subtask,
} from './types.js';
import { setHiveTask, updateHiveTaskStatus, updateSubtaskStatus } from './hive-state.js';
import { publishPheromone } from './pheromone-channel.js';
import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// ---------------------------------------------------------------------------
// Registro de bots disponibles (simulado; en producción se poblaría desde DB/Redis)
// ---------------------------------------------------------------------------

const BOT_REGISTRY: Map<BotRole, Bot> = new Map([
  [
    'researcher',
    {
      id: 'bot-researcher-01',
      role: 'researcher',
      status: 'idle',
      skills: ['web_search', 'doc_analysis'],
      capacity: 3,
    },
  ],
  [
    'coder',
    {
      id: 'bot-coder-01',
      role: 'coder',
      status: 'idle',
      skills: ['code_generation', 'code_review'],
      capacity: 2,
    },
  ],
  [
    'tester',
    {
      id: 'bot-tester-01',
      role: 'tester',
      status: 'idle',
      skills: ['unit_tests', 'integration_tests'],
      capacity: 2,
    },
  ],
  [
    'deployer',
    {
      id: 'bot-deployer-01',
      role: 'deployer',
      status: 'idle',
      skills: ['docker_compose', 'traefik'],
      capacity: 1,
    },
  ],
  [
    'doc-writer',
    {
      id: 'bot-docwriter-01',
      role: 'doc-writer',
      status: 'idle',
      skills: ['markdown', 'openapi'],
      capacity: 2,
    },
  ],
  [
    'security',
    {
      id: 'bot-security-01',
      role: 'security',
      status: 'idle',
      skills: ['codeql', 'dependency_audit'],
      capacity: 1,
    },
  ],
]);

// ---------------------------------------------------------------------------
// Descomposición de objetivos en subtareas (heurística por palabras clave)
// ---------------------------------------------------------------------------

function inferRequiredRoles(objective: string, explicitRoles?: BotRole[]): BotRole[] {
  if (explicitRoles && explicitRoles.length > 0) {
    return explicitRoles;
  }

  const lower = objective.toLowerCase();
  const roles: BotRole[] = [];

  if (lower.includes('invest') || lower.includes('resear') || lower.includes('busca')) {
    roles.push('researcher');
  }
  if (lower.includes('cod') || lower.includes('implement') || lower.includes('develop')) {
    roles.push('coder');
  }
  if (lower.includes('test') || lower.includes('prueba') || lower.includes('verif')) {
    roles.push('tester');
  }
  if (lower.includes('deploy') || lower.includes('despliega') || lower.includes('lanza')) {
    roles.push('deployer');
  }
  if (lower.includes('doc') || lower.includes('readme') || lower.includes('openapi')) {
    roles.push('doc-writer');
  }
  if (lower.includes('securit') || lower.includes('seguridad') || lower.includes('vuln')) {
    roles.push('security');
  }

  // Si no se infiere nada, usar researcher + coder como mínimo
  return roles.length > 0 ? roles : ['researcher', 'coder'];
}

function buildSubtasks(taskId: string, roles: BotRole[], objective: string): Subtask[] {
  const subtasks: Subtask[] = [];
  let prevId: string | undefined;

  for (const role of roles) {
    const id = randomUUID();
    const subtask: Subtask = {
      id,
      parentTaskId: taskId,
      description: `[${role}] ${objective}`,
      assignedBotRole: role,
      assignedBotId: BOT_REGISTRY.get(role)?.id,
      status: 'pending',
      dependencies: prevId ? [prevId] : [],
    };
    subtasks.push(subtask);
    prevId = id;
  }

  return subtasks;
}

// ---------------------------------------------------------------------------
// QueenBee
// ---------------------------------------------------------------------------

export interface QueenBeeOptions {
  /** Cola BullMQ donde se encolan los jobs de Worker Bees. */
  queue: Queue;
}

export class QueenBee {
  private readonly queue: Queue;

  constructor(options: QueenBeeOptions) {
    this.queue = options.queue;
  }

  /**
   * Procesa un HiveDispatchPayload:
   * - Crea la HiveTask y sus subtareas.
   * - Persiste en Redis (HiveState).
   * - Encola jobs BullMQ para cada Worker Bee.
   * - Publica mensajes ferumonales de inicio.
   */
  async dispatch(payload: HiveDispatchPayload): Promise<HiveDispatchResult> {
    const taskId = randomUUID();
    const queenId = `queen-${taskId.slice(0, 8)}`;
    const now = new Date().toISOString();

    const roles = inferRequiredRoles(payload.objective, payload.required_roles);
    const subtasks = buildSubtasks(taskId, roles, payload.objective);

    const hiveTask: HiveTask = {
      id: taskId,
      tenantSlug: payload.tenant_slug,
      requestId: payload.request_id,
      objective: payload.objective,
      subtasks,
      status: 'planned',
      assignedTo: queenId,
      createdAt: now,
      updatedAt: now,
    };

    await setHiveTask(hiveTask);

    // Publicar mensaje feromonal de inicio (requiere cliente pub/sub temporal)
    const pubClient = createClient({
      url: REDIS_URL,
      password: process.env.REDIS_PASSWORD,
    });
    await pubClient.connect();

    try {
      await publishPheromone(pubClient, taskId, {
        from: queenId,
        to: 'broadcast',
        type: 'finding',
        content: `Queen ${queenId} iniciando colmena para: "${payload.objective}"`,
        metadata: { roles, subtasks_count: subtasks.length },
      });

      // Actualizar estado a in_progress
      await updateHiveTaskStatus(taskId, 'in_progress');

      // Encolar un job BullMQ por cada subtarea
      for (const subtask of subtasks) {
        await updateSubtaskStatus(taskId, subtask.id, 'assigned');

        await this.queue.add(
          'hive_worker_bee',
          {
            type: 'hive_dispatch',
            payload: {
              hive_task_id: taskId,
              subtask_id: subtask.id,
              subtask_description: subtask.description,
              bot_role: subtask.assignedBotRole,
              bot_id: subtask.assignedBotId,
              objective: payload.objective,
            },
            tenant_slug: payload.tenant_slug,
            request_id: payload.request_id,
            initiated_by: 'system',
            metadata: {
              hive_task_id: taskId,
              bot_role: subtask.assignedBotRole,
              cost_budget_usd: payload.cost_budget_usd,
              ...payload.metadata,
            },
          },
          {
            jobId: `hive:${taskId}:${subtask.id}`,
            attempts: 2,
            backoff: { type: 'exponential', delay: 3_000 },
          }
        );

        process.stdout.write(
          `${JSON.stringify({
            ts: new Date().toISOString(),
            event: 'hive_subtask_enqueued',
            hive_task_id: taskId,
            subtask_id: subtask.id,
            bot_role: subtask.assignedBotRole,
            tenant_slug: payload.tenant_slug,
            request_id: payload.request_id,
          })}\n`
        );
      }
    } finally {
      if (pubClient.isOpen) {
        await pubClient.quit();
      }
    }

    return {
      hive_task_id: taskId,
      subtasks_count: subtasks.length,
      status: 'in_progress',
    };
  }
}
