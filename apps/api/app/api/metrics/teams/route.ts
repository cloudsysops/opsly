import type { NextRequest } from 'next/server';
import { Queue } from 'bullmq';
import { requireAdminAccess } from '../../../../lib/auth';
import { getBullmqRedisConnection } from '../../../../lib/bullmq-redis';
import { CACHE_TTL } from '../../../../lib/constants';
import { getCache, setCache } from '../../../../lib/redis-cache';

const TOTAL_PARALLEL_CAPACITY = 8;

const TEAM_CONFIGS = [
  {
    name: 'frontend-team',
    specialization: 'frontend',
    max_parallel: 2,
    handles: ['ui_fix', 'style_change', 'component_update'],
    status: 'active',
  },
  {
    name: 'backend-team',
    specialization: 'backend',
    max_parallel: 3,
    handles: ['api_fix', 'logic_change', 'migration'],
    status: 'active',
  },
  {
    name: 'ml-team',
    specialization: 'ml',
    max_parallel: 2,
    handles: ['model_update', 'prompt_optimization', 'cache_warming'],
    status: 'active',
  },
  {
    name: 'infra-team',
    specialization: 'infra',
    max_parallel: 1,
    handles: ['deploy', 'config_change', 'scaling'],
    status: 'active',
  },
] as const;

async function getTeamCounts(name: string): Promise<{ waiting: number; active: number }> {
  const connection = getBullmqRedisConnection();
  if (!connection) {
    throw new Error('BullMQ Redis not configured');
  }

  const queue = new Queue(`team-${name}`, { connection });
  try {
    const [waiting, active] = await Promise.all([queue.getWaitingCount(), queue.getActiveCount()]);
    return { waiting, active };
  } finally {
    await queue.close();
  }
}

type TeamMetricsSnapshot = {
  teams: Array<
    (typeof TEAM_CONFIGS)[number] & {
      waiting?: number;
      active?: number;
    }
  >;
  total_parallel_capacity: number;
  timestamp: string;
};

export async function GET(req: NextRequest): Promise<Response> {
  const authError = await requireAdminAccess(req);
  if (authError) return authError;

  const cacheKey = 'metrics:teams_queues_snapshot';
  const cached = await getCache<TeamMetricsSnapshot>(cacheKey);
  if (cached !== null) {
    return Response.json(cached);
  }

  const teams = await Promise.all(
    TEAM_CONFIGS.map(async (config) => {
      let counts: { waiting: number; active: number } | undefined;
      try {
        counts = await getTeamCounts(config.name);
      } catch {
        // Redis no alcanzable — UI muestra "—"
      }
      return { ...config, ...counts };
    })
  );

  const body: TeamMetricsSnapshot = {
    teams,
    total_parallel_capacity: TOTAL_PARALLEL_CAPACITY,
    timestamp: new Date().toISOString(),
  };

  // Bolt Optimization: Cache the queue snapshot for 60s
  void setCache(cacheKey, body, CACHE_TTL.SHORT);

  return Response.json(body);
}
