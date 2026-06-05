import { createClient } from 'redis';
import { z } from 'zod';
import { jsonError, serverErrorLogged, tryRoute } from '../../../../../lib/api-response';
import { HTTP_STATUS } from '../../../../../lib/constants';
import { sanitizePublicPortalServices } from '../../../../../lib/portal-me';
import { getServiceClient } from '../../../../../lib/supabase';
import type { Json } from '../../../../../lib/supabase/types';
import { formatZodError } from '../../../../../lib/validation';

const querySchema = z.object({
  email: z.string().email(),
});

const RATE_WINDOW_SECONDS = 60;
const RATE_MAX = 30;

type RedisClient = ReturnType<typeof createClient>;

let redisConnect: Promise<RedisClient> | null = null;

async function getRedis(): Promise<RedisClient> {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    throw new Error('Missing REDIS_URL');
  }
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

function clientIp(request: Request): string {
  const cfIp = request.headers.get('cf-connecting-ip');
  if (cfIp) {
    return cfIp.trim();
  }

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim();
    if (first) {
      return first;
    }
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return 'unknown';
}

export function GET(request: Request): Promise<Response> {
  return tryRoute('GET /api/public/tenants/status', async () => {
    const url = new URL(request.url);
    const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
    if (!parsed.success) {
      return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
    }

    let redis: RedisClient;
    try {
      redis = await getRedis();
    } catch {
      return jsonError('Rate limiting unavailable', HTTP_STATUS.SERVICE_UNAVAILABLE);
    }

    const ip = clientIp(request);
    const key = `ratelimit:public-status:${ip}`;

    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, RATE_WINDOW_SECONDS);
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
