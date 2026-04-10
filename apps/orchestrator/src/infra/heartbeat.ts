import { getOrchestratorRedis } from "../metering/redis-client.js";

const HEARTBEAT_TTL_SECONDS = 60;

export async function recordOrchestratorHeartbeat(
  serviceName: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  const redis = getOrchestratorRedis();
  if (!redis) {
    return;
  }
  const key = `heartbeat:${serviceName}`;
  const payload = JSON.stringify({
    ts: Date.now(),
    metadata,
  });
  await redis.set(key, payload, "EX", HEARTBEAT_TTL_SECONDS);
}
