import { getTenantUsage } from "@intcloudsysops/llm-gateway/logger";
import { NextRequest } from "next/server";
import { requireAdminToken } from "../../../../../lib/auth";

type RouteContext = {
  params: {
    slug: string;
  };
};

export async function GET(
  request: NextRequest,
  context: RouteContext,
): Promise<Response> {
  const authError = requireAdminToken(request);
  if (authError) {
    return authError;
  }

  const periodParam = request.nextUrl.searchParams.get("period");
  const period = periodParam === "month" ? "month" : "today";
  const usage = await getTenantUsage(context.params.slug, period);

  return Response.json({
    tenant: context.params.slug,
    period,
    ...usage,
    cache_hit_rate:
      usage.requests > 0
        ? Math.round((usage.cache_hits / usage.requests) * 100)
        : 0,
  });
}
