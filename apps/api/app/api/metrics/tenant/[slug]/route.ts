import { getTenantUsage } from "@intcloudsysops/llm-gateway/logger";
import { NextRequest } from "next/server";
import { requireAdminAccess } from "../../../../../lib/auth";

type RouteContext = {
  params: Promise<{
    slug: string;
  }>;
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const periodParam = request.nextUrl.searchParams.get("period");
  const period = periodParam === "month" ? "month" : "today";
  const { slug } = await context.params;
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
