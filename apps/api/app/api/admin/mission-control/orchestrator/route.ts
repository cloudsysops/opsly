import { NextResponse } from 'next/server';
import type { RedisClientType } from 'redis';

function getRedisUrl(): string {
  return process.env.REDIS_URL ?? 'redis://localhost:6379';
}

async function createRedis(): Promise<RedisClientType> {
  const { createClient } = await import('redis');
  return createClient({ url: getRedisUrl() }) as RedisClientType;
}

async function readOpenclawQueueLengths(redis: RedisClientType): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}> {
  const [waiting, active, completed, failed] = await Promise.all([
    redis.lLen('bull:openclaw:wait'),
    redis.lLen('bull:openclaw:active'),
    redis.lLen('bull:openclaw:completed'),
    redis.lLen('bull:openclaw:failed'),
  ]);
  return { waiting, active, completed, failed };
}

function buildWorkersSnapshot(): Record<string, { concurrency: number; active: number }> {
  return {
    ollama: {
      concurrency: parseInt(process.env.ORCHESTRATOR_OLLAMA_CONCURRENCY ?? '2', 10),
      active: 0,
    },
    cursor: {
      concurrency: parseInt(process.env.ORCHESTRATOR_CURSOR_CONCURRENCY ?? '2', 10),
      active: 0,
    },
    n8n: {
      concurrency: parseInt(process.env.ORCHESTRATOR_N8N_CONCURRENCY ?? '2', 10),
      active: 0,
    },
    drive: {
      concurrency: parseInt(process.env.ORCHESTRATOR_DRIVE_CONCURRENCY ?? '1', 10),
      active: 0,
    },
    notify: {
      concurrency: parseInt(process.env.ORCHESTRATOR_NOTIFY_CONCURRENCY ?? '3', 10),
      active: 0,
    },
  };
}

export async function GET(): Promise<Response> {
  try {
    const redis = await createRedis();
    await redis.connect();
    const queue = await readOpenclawQueueLengths(redis);
    await redis.disconnect();

    const mode = process.env.OPSLY_ORCHESTRATOR_MODE ?? 'worker-enabled';
    const role = mode === 'worker-enabled' ? 'worker' : 'control';

    return NextResponse.json({
      mode,
      role,
      workers: buildWorkersSnapshot(),
      queue,
    });
  } catch (err) {
    console.error('[mission-control/orchestrator] Error:', err);
    return NextResponse.json({
      mode: 'unknown',
      role: 'unknown',
      workers: {},
      queue: { waiting: 0, active: 0, completed: 0, failed: 0 },
    });
  }
}
