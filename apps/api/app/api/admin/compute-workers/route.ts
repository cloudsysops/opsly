import { NextResponse } from 'next/server';
import type { RedisClientType } from 'redis';

import { requireAdminAccess } from '../../../../lib/auth';
import { buildComputeWorkerSnapshot, getComputeWorkersRegistry } from '../../../../lib/compute-worker-snapshot';

function getRedisUrl(): string {
  return process.env.REDIS_URL?.trim() ?? '';
}

async function createRedis(): Promise<RedisClientType> {
  const url = getRedisUrl();
  if (!url) {
    throw new Error('REDIS_URL is not configured');
  }
  const { createClient } = await import('redis');
  return createClient({ url }) as RedisClientType;
}

async function readQueue(redis: RedisClientType, name: string): Promise<{
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}> {
  const [waiting, active, completed, failed] = await Promise.all([
    redis.lLen(`bull:${name}:wait`),
    redis.lLen(`bull:${name}:active`),
    redis.lLen(`bull:${name}:completed`),
    redis.lLen(`bull:${name}:failed`),
  ]);
  return { waiting, active, completed, failed };
}

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const registry = getComputeWorkersRegistry();
  const emptyQueue = { waiting: 0, active: 0, completed: 0, failed: 0 };
  const heartbeats: Record<string, string | null> = {};

  try {
    const redis = await createRedis();
    await redis.connect();
    for (const worker of registry.workers) {
      heartbeats[worker.workerId] = await redis.get(`opsly:worker:heartbeat:${worker.workerId}`);
    }
    const queues = {
      'content-video': await readQueue(redis, 'content-video'),
      openclaw: await readQueue(redis, 'openclaw'),
    };
    await redis.disconnect();
    return NextResponse.json(buildComputeWorkerSnapshot(heartbeats, queues));
  } catch {
    return NextResponse.json(
      buildComputeWorkerSnapshot(heartbeats, {
        'content-video': emptyQueue,
        openclaw: emptyQueue,
      }),
    );
  }
}
