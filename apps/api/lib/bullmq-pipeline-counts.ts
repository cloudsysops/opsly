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

const CACHE_KEY = 'bullmq:pipeline_totals';

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

export type BullmqPipelineTotals = {
  openclaw_total: number;
  teams_total: number;
  all_queues_total: number;
};

/**
 * Jobs en cola BullMQ (orquestador + equipos). Sin Redis devuelve null.
 *
 * OPTIMIZATION:
 * 1. Caches aggregated totals in Redis for 60s (CACHE_TTL.SHORT).
 * 2. Fetches queue totals in parallel using Promise.all.
 */
export async function getBullmqPipelineJobTotals(): Promise<BullmqPipelineTotals | null> {
  try {
    const cached = await getCache<BullmqPipelineTotals>(CACHE_KEY);
    if (cached) {
      return cached;
    }

    const [openclaw, ...teamTotals] = await Promise.all([
      pipelineTotalForQueue('openclaw'),
      ...TEAM_QUEUE_NAMES.map((n) => pipelineTotalForQueue(n)),
    ]);

    const teams_total = teamTotals.reduce((a, b) => a + b, 0);
    const totals = {
      openclaw_total: openclaw,
      teams_total,
      all_queues_total: openclaw + teams_total,
    };

    void setCache(CACHE_KEY, totals, CACHE_TTL.SHORT);

    return totals;
  } catch {
    return null;
  }
}
