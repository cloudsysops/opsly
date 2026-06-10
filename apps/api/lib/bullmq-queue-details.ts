import { Queue } from 'bullmq';
import { getBullmqRedisConnection } from './bullmq-redis';
import { getCache, setCache } from './redis-cache';
import { CACHE_TTL } from './constants';

const QUEUE_DEFS = [
  {
    name: 'openclaw',
    label: 'Orquestador OpenClaw',
    role: 'orchestrator' as const,
  },
  {
    name: 'team-frontend-team',
    label: 'Agentes · frontend',
    role: 'agent_team' as const,
  },
  {
    name: 'team-backend-team',
    label: 'Agentes · backend',
    role: 'agent_team' as const,
  },
  {
    name: 'team-ml-team',
    label: 'Agentes · ML',
    role: 'agent_team' as const,
  },
  {
    name: 'team-infra-team',
    label: 'Agentes · infra',
    role: 'agent_team' as const,
  },
] as const;

export type BullmqQueueDetail = {
  id: string;
  label: string;
  role: 'orchestrator' | 'agent_team';
  waiting: number;
  active: number;
};

const CACHE_KEY = 'bullmq:queue_details';

/**
 * Conteos waiting/active por cola BullMQ (orquestador + equipos).
 *
 * OPTIMIZATION:
 * 1. Caches results in Redis for 60s (CACHE_TTL.SHORT) to avoid repeated expensive BullMQ queries.
 * 2. Fetches all queue counts in parallel using Promise.all instead of sequentially.
 * 3. Reuses the same Redis connection for all Queue instances.
 */
export async function getBullmqQueueDetails(): Promise<{
  redis_available: boolean;
  queues: BullmqQueueDetail[];
}> {
  const connection = getBullmqRedisConnection();
  if (!connection) {
    return { redis_available: false, queues: [] };
  }

  // Try to get from cache first
  const cached = await getCache<BullmqQueueDetail[]>(CACHE_KEY);
  if (cached) {
    return { redis_available: true, queues: cached };
  }

  const queues: BullmqQueueDetail[] = [];

  // Fetch all counts in parallel
  const results = await Promise.all(
    QUEUE_DEFS.map(async (def) => {
      const queue = new Queue(def.name, { connection });
      try {
        const [waiting, active] = await Promise.all([
          queue.getWaitingCount(),
          queue.getActiveCount(),
        ]);
        return {
          id: def.name,
          label: def.label,
          role: def.role,
          waiting,
          active,
        };
      } finally {
        await queue.close();
      }
    })
  );

  queues.push(...results);

  // Save to cache (non-blocking)
  void setCache(CACHE_KEY, queues, CACHE_TTL.SHORT);

  return { redis_available: true, queues };
}
