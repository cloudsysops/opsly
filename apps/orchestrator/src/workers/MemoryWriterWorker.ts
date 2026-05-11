import { Job, Worker } from 'bullmq';
import { createClient } from 'redis';

interface MemoryWritePayload {
  tenant_slug?: string;
  request_id?: string;
  memory_key?: string;
  observation?: string;
  metadata?: Record<string, unknown>;
  ttl_seconds?: number;
}

const DEFAULT_TTL_SECONDS = 7 * 24 * 60 * 60;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function positiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

function memoryKey(payload: MemoryWritePayload): string {
  const tenant = payload.tenant_slug?.trim() || 'platform';
  const request = payload.request_id?.trim() || 'unknown';
  const suffix = payload.memory_key?.trim() || 'observations';
  return `maia:memory:${tenant}:${request}:${suffix}`;
}

export function startMemoryWriterWorker(connection: object) {
  const concurrency = positiveInt(process.env.ORCHESTRATOR_MAIA_MEMORY_CONCURRENCY, 2);
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'maia_memory_write') return;
      const payload = (job.data?.payload ?? job.data ?? {}) as MemoryWritePayload;
      const observation = payload.observation?.trim();
      if (!observation) {
        throw new Error('maia_memory_write requires payload.observation');
      }

      const redis = createClient({ url: REDIS_URL, password: process.env.REDIS_PASSWORD });
      await redis.connect();
      try {
        const key = memoryKey(payload);
        const entry = JSON.stringify({
          ts: new Date().toISOString(),
          tenant_slug: payload.tenant_slug ?? 'platform',
          request_id: payload.request_id ?? null,
          observation,
          metadata: payload.metadata ?? {},
        });
        await redis.lPush(key, entry);
        await redis.lTrim(key, 0, 99);
        await redis.expire(key, positiveInt(payload.ttl_seconds, DEFAULT_TTL_SECONDS));
        return { success: true, key };
      } finally {
        await redis.disconnect();
      }
    },
    { connection, concurrency }
  );
}
