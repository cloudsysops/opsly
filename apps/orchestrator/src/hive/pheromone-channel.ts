/**
 * SwarmOps — PheromoneChannel: canal feromonal vía Redis Pub/Sub.
 *
 * Los bots publican mensajes en tópicos con prefijo `opsly:hive:pheromone:{taskId}`.
 * El TTL simula la evaporación de feromonas: los mensajes se guardan en una lista
 * Redis con expiración configurable (por defecto 300 s).
 */

import { randomUUID } from 'node:crypto';
import { createClient } from 'redis';
import type { PheromoneMessage, PheromoneMessageType } from './types.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DEFAULT_TTL = 300; // 5 minutos

type RedisClient = ReturnType<typeof createClient>;

function channelKey(taskId: string): string {
  return `opsly:hive:pheromone:${taskId}`;
}

/**
 * Publica un mensaje feromonal en el canal de la tarea.
 * El mensaje queda disponible para que cualquier subscriber o lector lo consuma.
 *
 * @param publishClient  Cliente Redis ya conectado para publicaciones.
 * @param taskId         ID de la HiveTask asociada.
 * @param params         Datos del mensaje.
 * @returns              El PheromoneMessage publicado.
 */
export async function publishPheromone(
  publishClient: RedisClient,
  taskId: string,
  params: {
    from: string;
    to?: string;
    type: PheromoneMessageType;
    content: string;
    metadata?: Record<string, unknown>;
    ttl?: number;
  }
): Promise<PheromoneMessage> {
  const message: PheromoneMessage = {
    id: randomUUID(),
    from: params.from,
    to: params.to,
    type: params.type,
    content: params.content,
    metadata: params.metadata,
    timestamp: new Date().toISOString(),
    ttl: params.ttl ?? DEFAULT_TTL,
  };

  const channel = channelKey(taskId);

  // Pub/Sub: notifica suscriptores en tiempo real.
  await publishClient.publish(channel, JSON.stringify(message));

  // Persistencia breve (lista FIFO) para que latecomers puedan leer mensajes recientes.
  await publishClient.lPush(`${channel}:history`, JSON.stringify(message));
  await publishClient.expire(`${channel}:history`, message.ttl ?? DEFAULT_TTL);

  return message;
}

/**
 * Recupera el historial reciente de mensajes feromonales de una tarea.
 *
 * @param readClient  Cliente Redis ya conectado.
 * @param taskId      ID de la HiveTask.
 * @param limit       Máximo de mensajes a devolver (de más recientes a menos).
 */
export async function readPheromones(
  readClient: RedisClient,
  taskId: string,
  limit = 50
): Promise<PheromoneMessage[]> {
  const channel = channelKey(taskId);
  const items = await readClient.lRange(`${channel}:history`, 0, limit - 1);
  return items.map((item) => JSON.parse(item) as PheromoneMessage);
}

/**
 * Suscribe una función callback a los mensajes feromonales de una tarea.
 * Crea y conecta su propio cliente para no bloquear al publicador.
 *
 * @param taskId    ID de la HiveTask a suscribir.
 * @param onMessage Callback invocado con cada PheromoneMessage recibido.
 * @returns         Función para cancelar la suscripción y cerrar el cliente.
 */
export async function subscribePheromones(
  taskId: string,
  onMessage: (msg: PheromoneMessage) => void
): Promise<() => Promise<void>> {
  const subscriber = createClient({
    url: REDIS_URL,
    password: process.env.REDIS_PASSWORD,
  });
  await subscriber.connect();

  const channel = channelKey(taskId);
  await subscriber.subscribe(channel, (raw) => {
    try {
      const msg = JSON.parse(raw) as PheromoneMessage;
      onMessage(msg);
    } catch {
      // Ignorar mensajes malformados
    }
  });

  return async () => {
    await subscriber.unsubscribe(channel);
    if (subscriber.isOpen) {
      await subscriber.quit();
    }
  };
}
