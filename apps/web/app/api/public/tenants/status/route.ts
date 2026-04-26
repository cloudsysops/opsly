import Redis from 'ioredis';
import { z } from 'zod';
import { adminClient } from '../../../../../lib/supabase/admin';
import type { Json } from '../../../../../lib/supabase/types';

const querySchema = z.object({
  email: z.string().email(),
});

const RATE_WINDOW_SECONDS = 60;
const RATE_MAX = 30;

let redisSingleton: Redis | null = null;

function getRedis(): Redis {
  if (!redisSingleton) {
    const url = process.env.REDIS_URL;
    if (!url) {
      throw new Error('Missing REDIS_URL');
    }
    redisSingleton = new Redis(url);
  }
  return redisSingleton;
}

function clientIp(request: Request): string {
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

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let redis: Redis;
  try {
    redis = getRedis();
  } catch {
    return Response.json({ error: 'Rate limiting unavailable' }, { status: 503 });
  }

  const ip = clientIp(request);
  const key = `ratelimit:public-status:${ip}`;

  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, RATE_WINDOW_SECONDS);
  }
  if (count > RATE_MAX) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { data: tenant, error } = await adminClient
    .schema('platform')
    .from('tenants')
    .select('status, progress, services')
    .eq('owner_email', parsed.data.email)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  if (!tenant) {
    return Response.json({ status: 'not_found' as const });
  }

  return Response.json({
    status: tenant.status,
    progress: tenant.progress,
    services: tenant.services as Json,
  });
}
