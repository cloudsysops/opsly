import apiPkg from '../../../package.json';
import { HTTP_STATUS } from '../../../lib/constants';

const HEALTH_FETCH_MS = 2000;

type CheckStatus = 'ok' | 'degraded' | 'error' | 'skipped';

function resolveVersion(): string {
  return typeof apiPkg.version === 'string' ? apiPkg.version : '0.0.0';
}

function redisConfigured(): CheckStatus {
  const url = process.env.REDIS_URL?.trim();
  if (url && url.length > 0) {
    return 'ok';
  }
  return 'skipped';
}

async function supabaseReachable(): Promise<CheckStatus> {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? process.env.SUPABASE_URL?.trim();
  if (!raw) {
    return 'error';
  }
  const base = raw.replace(/\/+$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEALTH_FETCH_MS);
  try {
    const res = await fetch(`${base}/auth/v1/health`, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);
    if (res.ok) {
      return 'ok';
    }
    // Supabase hosted puede responder 401/403 en `/auth/v1/health` sin credenciales;
    // la respuesta HTTP demuestra alcanzabilidad TLS (no es caída del proyecto).
    if (res.status === HTTP_STATUS.UNAUTHORIZED || res.status === HTTP_STATUS.FORBIDDEN) {
      return 'ok';
    }
    return 'degraded';
  } catch {
    clearTimeout(timeout);
    return 'degraded';
  }
}

export async function GET(): Promise<Response> {
  const [supabase, redis] = await Promise.all([
    supabaseReachable(),
    Promise.resolve(redisConfigured()),
  ]);

  const body = {
    status: 'ok' as const,
    timestamp: new Date().toISOString(),
    version: resolveVersion(),
    checks: {
      supabase,
      redis,
    },
  };

  return Response.json(body);
}
