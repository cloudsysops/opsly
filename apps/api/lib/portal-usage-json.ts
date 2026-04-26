import { getTenantUsage } from '@intcloudsysops/llm-gateway/logger';
import type { NextRequest } from 'next/server';

/**
 * Respuesta JSON de uso LLM para un tenant (compartida por
 * `GET /api/portal/usage` y `GET /api/portal/tenant/[slug]/usage`).
 */
export async function respondPortalTenantUsage(
  request: NextRequest,
  tenantSlug: string
): Promise<Response> {
  const periodParam = request.nextUrl.searchParams.get('period');
  const period = periodParam === 'month' ? 'month' : 'today';
  const usage = await getTenantUsage(tenantSlug, period);

  return Response.json({
    tenant: tenantSlug,
    period,
    ...usage,
    cache_hit_rate: usage.requests > 0 ? Math.round((usage.cache_hits / usage.requests) * 100) : 0,
  });
}
