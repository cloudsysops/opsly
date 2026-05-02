import { NextResponse } from 'next/server';
import type { RedisClientType } from 'redis';

const ORCHESTRATOR_HEALTH_FETCH_MS = 2000;

function getRedisUrl(): string {
  return process.env.REDIS_URL ?? 'redis://localhost:6379';
}

function getOrchestratorInternalBaseUrl(): string {
  const raw = process.env.ORCHESTRATOR_INTERNAL_URL?.trim();
  if (raw && raw.length > 0) {
    return raw.replace(/\/+$/, '');
  }
  return 'http://orchestrator:3011';
}

type OrchestratorHealthPayload = {
  mode: string;
  role: string;
};

async function fetchOrchestratorHealth(): Promise<OrchestratorHealthPayload | null> {
  const base = getOrchestratorInternalBaseUrl();
  const url = `${base}/health`;
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort();
  }, ORCHESTRATOR_HEALTH_FETCH_MS);
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!res.ok) {
      return null;
    }
    const body = (await res.json()) as Record<string, unknown>;
    const mode = typeof body.mode === 'string' ? body.mode.trim() : '';
    const role = typeof body.role === 'string' ? body.role.trim() : '';
    if (mode.length === 0 || role.length === 0) {
      return null;
    }
    return { mode, role };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackModeAndRoleFromApiEnv(): OrchestratorHealthPayload {
  const mode = process.env.OPSLY_ORCHESTRATOR_MODE ?? 'worker-enabled';
  const role = mode === 'worker-enabled' ? 'worker' : 'control';
  return { mode, role };
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

    const health = await fetchOrchestratorHealth();
    const { mode, role } = health ?? fallbackModeAndRoleFromApiEnv();

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
