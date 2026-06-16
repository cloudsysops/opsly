import { Queue } from 'bullmq';
import { getBullmqRedisConnection } from './bullmq-redis';
import { getCache, setCache } from './redis-cache';
import { CACHE_TTL } from './constants';

const TEAM_QUEUE_NAMES = [
  'team-frontend-team',
  'team-backend-team',
  'team-ml-team',
  'team-infra-team',
] as const;

async function pipelineTotalForQueue(name: string): Promise<number> {
  const connection = getBullmqRedisConnection();
  if (!connection) {
    throw new Error('BullMQ Redis not configured');
  }

  const queue = new Queue(name, { connection });
  try {
    const [waiting, active] = await Promise.all([queue.getWaitingCount(), queue.getActiveCount()]);
    return waiting + active;
  } finally {
    await queue.close();
  }
}

/**
 * Jobs en cola BullMQ (orquestador + equipos). Sin Redis devuelve null.
 * Cached in Redis (60s) to improve admin dashboard response time.
 */
export async function getBullmqPipelineJobTotals(): Promise<{
  openclaw_total: number;
  teams_total: number;
  all_queues_total: number;
} | null> {
  const cacheKey = 'metrics:bullmq:totals';
  try {
    const cached = await getCache<{
      openclaw_total: number;
      teams_total: number;
      all_queues_total: number;
    }>(cacheKey);

    if (cached) {
      return cached;
    }

    const openclaw = await pipelineTotalForQueue('openclaw');
    const teamTotals = await Promise.all(TEAM_QUEUE_NAMES.map((n) => pipelineTotalForQueue(n)));
    const teams_total = teamTotals.reduce((a, b) => a + b, 0);

    const result = {
      openclaw_total: openclaw,
      teams_total,
      all_queues_total: openclaw + teams_total,
    };

    // Async cache update
    void setCache(cacheKey, result, CACHE_TTL.SHORT);

    return result;
  } catch {
    return null;
  }
}
