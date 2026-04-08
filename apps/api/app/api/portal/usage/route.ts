import { getTenantUsage } from "@intcloudsysops/llm-gateway/logger";
import { NextRequest } from "next/server";
import { resolveTrustedPortalSession } from "../../../../lib/portal-trusted-identity";

/**
 * Uso LLM del tenant de la sesión (mismo agregado que admin `GET /api/metrics/tenant/:slug`,
 * pero sin slug en URL: solo el tenant vinculado al JWT).
 */
export async function GET(request: NextRequest): Promise<Response> {
  const trusted = await resolveTrustedPortalSession(request);
  if (!trusted.ok) {
    return trusted.response;
  }

  const periodParam = request.nextUrl.searchParams.get("period");
  const period = periodParam === "month" ? "month" : "today";
  const slug = trusted.session.tenant.slug;
  const usage = await getTenantUsage(slug, period);

  return Response.json({
    tenant: slug,
    period,
    ...usage,
    cache_hit_rate:
      usage.requests > 0
        ? Math.round((usage.cache_hits / usage.requests) * 100)
        : 0,
  });
}
