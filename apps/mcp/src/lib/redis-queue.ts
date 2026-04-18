/**
 * Conexión BullMQ alineada con `apps/orchestrator/src/queue.ts` (REDIS_URL + REDIS_PASSWORD).
 */
export type BullmqConnection = {
  host: string;
  port: number;
  password?: string;
};

/**
 * @returns `null` si no hay REDIS_URL válida (el caller debe fallar con mensaje claro).
 */
export function getOpenclawQueueConnection(): BullmqConnection | null {
  const raw = process.env.REDIS_URL?.trim();
  if (!raw || raw.length === 0) {
    return null;
  }
  try {
    const redisUrl = new URL(raw);
    const passwordFromUrl = redisUrl.password ? decodeURIComponent(redisUrl.password) : "";
    return {
      host: redisUrl.hostname,
      port: Number(redisUrl.port || "6379"),
      password: process.env.REDIS_PASSWORD?.trim() || passwordFromUrl || undefined,
    };
  } catch {
    return null;
  }
}
