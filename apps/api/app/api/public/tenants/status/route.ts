import { createClient } from 'redis';
import { z } from 'zod';
import { jsonError, serverErrorLogged, tryRoute } from '@/lib/api-response';
import { extractIp } from '../../../../../lib/audit';
import { HTTP_STATUS } from '@intcloudsysops/constants';
import { sanitizePublicPortalServices } from '../../../../../lib/portal-me';
import { getServiceClient } from '../../../../../lib/supabase';
import type { Json } from '../../../../../lib/supabase/types';
import { formatZodError } from '../../../../../lib/validation';

const querySchema = z.object({
  email: z.string().email(),
});

const RATE_WINDOW_SECONDS = 60;
const RATE_MAX = 30;

const RATE_LIMIT_LUA = `
local current = redis.call('INCR', KEYS[1])
if current == 1 then
  redis.call('EXPIRE', KEYS[1], ARGV[1])
end
return current
`;

type RedisClient = ReturnType<typeof createClient>;

let redisConnect: Promise<RedisClient> | null = null;

async function getRedis(): Promise<RedisClient | null> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  if (!redisConnect) {
    redisConnect = (async (): Promise<RedisClient> => {
      const c = createClient({ url });
      c.on('error', () => {});
      await c.connect();
      return c;
    })();
  }
  return redisConnect;
}

export function GET(request: Request): Promise<Response> {
  return tryRoute('GET /api/public/tenants/status', async () => {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
    }

    const ip = extractIp(request);
    const key = `ratelimit:public-status:${ip}`;
    let count = 0;

    try {
      const redis = await getRedis();
      if (redis) {
        const result = await redis.sendCommand(['EVAL', RATE_LIMIT_LUA, '1', key, String(RATE_WINDOW_SECONDS)]);
        count = typeof result === 'number' ? result : Number(result);
      } else {
        // Sentinel: Fail-secure if Redis (the rate limit backend) is unavailable.
        return jsonError('Service temporarily unavailable', HTTP_STATUS.SERVICE_UNAVAILABLE);
      }
    } catch (e) {
      return serverErrorLogged('public status rate limit:', e);
    }

    if (count > RATE_MAX) {
      return jsonError('Too many requests', HTTP_STATUS.TOO_MANY_REQUESTS);
    }

    const { data: tenant, error } = await getServiceClient()
      .schema('platform')
      .from('tenants')
      .select('status, progress, services, slug')
      .eq('owner_email', parsed.data.email)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      return serverErrorLogged('public tenant status:', error);
    }

    if (!tenant) {
      return Response.json({ status: 'not_found' as const });
    }

    return Response.json({
      status: tenant.status,
      progress: tenant.progress,
      services: sanitizePublicPortalServices(tenant.slug, tenant.services as Json),
    });
  });
}
