/**
 * SwarmOps — HiveState: tablero compartido de la colmena en Redis.
 *
 * Cada HiveTask se persiste con su estado y subtareas.
 * TTL alineado con el del JobState del orquestador (24 h).
 */

import { createClient } from 'redis';
import type { HiveTask, Subtask, SubtaskStatus, HiveTaskStatus } from './types.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const HIVE_TTL_SECONDS = 86_400; // 24 h

type RedisClient = ReturnType<typeof createClient>;

let _client: RedisClient | null = null;

async function getClient(): Promise<RedisClient> {
  if (!_client) {
    _client = createClient({
      url: REDIS_URL,
      password: process.env.REDIS_PASSWORD,
    });
    await _client.connect();
  }
  return _client;
}

function taskKey(taskId: string): string {
  return `opsly:hive:task:${taskId}`;
}

/** Persiste (crea o reemplaza) una HiveTask en Redis. */
export async function setHiveTask(task: HiveTask): Promise<void> {
  const client = await getClient();
  await client.setEx(taskKey(task.id), HIVE_TTL_SECONDS, JSON.stringify(task));
}

/** Recupera una HiveTask desde Redis, o null si no existe. */
export async function getHiveTask(taskId: string): Promise<HiveTask | null> {
  const client = await getClient();
  const raw = await client.get(taskKey(taskId));
  return raw ? (JSON.parse(raw) as HiveTask) : null;
}

/** Actualiza el estado global de una HiveTask. */
export async function updateHiveTaskStatus(
  taskId: string,
  status: HiveTaskStatus,
  result?: Record<string, unknown>
): Promise<void> {
  const task = await getHiveTask(taskId);
  if (!task) {
    return;
  }
  task.status = status;
  task.updatedAt = new Date().toISOString();
  if (result !== undefined) {
    task.result = result;
  }
  await setHiveTask(task);
}

/** Actualiza el estado de una Subtask concreta dentro de una HiveTask. */
export async function updateSubtaskStatus(
  taskId: string,
  subtaskId: string,
  status: SubtaskStatus,
  result?: Record<string, unknown>
): Promise<void> {
  const task = await getHiveTask(taskId);
  if (!task) {
    return;
  }
  const sub = task.subtasks.find((s) => s.id === subtaskId);
  if (!sub) {
    return;
  }
  sub.status = status;
  if (result !== undefined) {
    sub.result = result;
  }
  task.updatedAt = new Date().toISOString();
  await setHiveTask(task);
}

/** Agrega una Subtask a una HiveTask existente. */
export async function addSubtask(taskId: string, subtask: Subtask): Promise<void> {
  const task = await getHiveTask(taskId);
  if (!task) {
    return;
  }
  task.subtasks.push(subtask);
  task.updatedAt = new Date().toISOString();
  await setHiveTask(task);
}

/** Cierra la conexión Redis del HiveState (para shutdown limpio). */
export async function closeHiveStateStore(): Promise<void> {
  if (!_client) {
    return;
  }
  try {
    if (_client.isOpen) {
      await _client.quit();
    }
  } finally {
    _client = null;
  }
}
