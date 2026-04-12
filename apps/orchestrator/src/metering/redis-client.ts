/**
 * Cliente Redis dedicado a medición (`usage:{tenantUuid}:{metric}`), alineado al flush en `apps/api`.
 * Usa `ioredis` (patrón distinto al paquete `redis` v4 usado por BullMQ / workers).
 */
import Redis from "ioredis";

let client: Redis | null = null;

function redisUrl(): string | null {
  const u = process.env.REDIS_URL?.trim();
  return u && u.length > 0 ? u : null;
}

/**
 * Singleton perezoso. Sin `REDIS_URL` devuelve `null` (medición omitida, sin throw).
 */
export function getOrchestratorRedis(): Redis | null {
  const url = redisUrl();
  if (!url) {
    return null;
  }
  if (!client) {
    client = new Redis(url, {
      maxRetriesPerRequest: 2,
      enableReadyCheck: true,
    });
    client.on("error", (err: Error) => {
      console.error("[orchestrator-redis]", err.message);
    });
  }
  return client;
}

export async function closeOrchestratorRedis(): Promise<void> {
  if (!client) {
    return;
  }
  client.disconnect();
  client = null;
}
