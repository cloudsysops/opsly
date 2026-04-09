import { HTTP_STATUS } from "../../../../lib/constants";
import { respondPortalTenantHealth } from "../../../../lib/portal-health-json";

const PORTAL_HEALTH_SLUG_MIN_LEN = 3;
const PORTAL_HEALTH_SLUG_MAX_LEN = 30;

/**
 * Health check público del portal para un tenant identificado por query `?slug=`.
 * No requiere autenticación — útil para Uptime Kuma o herramientas de monitoring.
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const slug = url.searchParams.get("slug");

  if (
    !slug ||
    slug.length < PORTAL_HEALTH_SLUG_MIN_LEN ||
    slug.length > PORTAL_HEALTH_SLUG_MAX_LEN
  ) {
    return Response.json(
      {
        error: "Missing or invalid ?slug= parameter (3–30 chars, slug pattern)",
      },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  if (!/^[a-z0-9-]+$/.test(slug)) {
    return Response.json(
      { error: "Invalid slug format" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  return respondPortalTenantHealth(slug);
}
