import { jsonError, tryRoute } from "../../../../lib/api-response";
import { requireAdminToken } from "../../../../lib/auth";
import { HTTP_STATUS } from "../../../../lib/constants";
import { getServiceClient } from "../../../../lib/supabase";

const MAX_LIMIT = 200;
const DEFAULT_LIMIT = 50;

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function clampLimit(limit: number): number {
  return Math.min(limit, MAX_LIMIT);
}

interface AuditFilters {
  slug: string | null;
  action: string | null;
  from: string | null;
  to: string | null;
  after: string | null;
  limit: number;
}

function parseFilters(url: URL): AuditFilters {
  return {
    slug: url.searchParams.get("slug"),
    action: url.searchParams.get("action"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    after: url.searchParams.get("after"),
    limit: clampLimit(
      parsePositiveInt(url.searchParams.get("limit"), DEFAULT_LIMIT),
    ),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, filters: AuditFilters): any {
  let q = query;
  if (filters.slug) q = q.eq("tenant_slug", filters.slug);
  if (filters.action) q = q.eq("action", filters.action.toUpperCase());
  if (filters.from) q = q.gte("created_at", filters.from);
  if (filters.to) q = q.lte("created_at", filters.to);
  if (filters.after) q = q.lt("id", filters.after); // keyset cursor
  return q;
}

function buildPage(
  data: Array<{ id: string }>,
  limit: number,
): {
  items: Array<{ id: string }>;
  hasNextPage: boolean;
  nextCursor: string | null;
} {
  const hasNextPage = data.length > limit;
  const items = hasNextPage ? data.slice(0, limit) : data;
  const nextCursor =
    hasNextPage && items.length > 0 ? items[items.length - 1].id : null;
  return { items, hasNextPage, nextCursor };
}

/** GET /api/admin/audit
 *
 * Query params: slug, action, from (ISO8601), to (ISO8601),
 *               after (UUID cursor), limit (default 50, max 200)
 */
export function GET(request: Request): Promise<Response> {
  return tryRoute("GET /api/admin/audit", async () => {
    const authError = requireAdminToken(request);
    if (authError) return authError;

    const filters = parseFilters(new URL(request.url));
    const client = getServiceClient();
    const baseQuery = client
      .schema("platform")
      .from("audit_events")
      .select(
        "id, tenant_slug, actor_email, action, resource, status_code, ip, created_at, metadata",
      )
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(filters.limit + 1); // +1 para detectar hasNextPage

    const { data, error } = await applyFilters(baseQuery, filters);

    if (error) {
      console.error("[audit GET] Supabase error:", error.message);
      return jsonError(
        "Failed to fetch audit events",
        HTTP_STATUS.INTERNAL_ERROR,
      );
    }

    const { items, hasNextPage, nextCursor } = buildPage(
      data ?? [],
      filters.limit,
    );
    return Response.json({
      items,
      pagination: { limit: filters.limit, hasNextPage, nextCursor },
    });
  });
}
