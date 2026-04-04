import { requireAdminToken } from "../../../lib/auth";
import {
  CreateTenantSchema,
  formatZodError,
  ListTenantsQuerySchema,
} from "../../../lib/validation";
import { provisionTenant } from "../../../lib/orchestrator";
import { getServiceClient } from "../../../lib/supabase";
import type { TenantStatus } from "../../../lib/supabase/types";

function isUniqueViolation(message: string, code: string | undefined): boolean {
  return code === "23505" || message.includes("duplicate key") || message.includes("unique constraint");
}

export async function GET(request: Request): Promise<Response> {
  const authError = requireAdminToken(request);
  if (authError) {
    return authError;
  }

  const url = new URL(request.url);
  const parsed = ListTenantsQuerySchema.safeParse(Object.fromEntries(url.searchParams));
  if (!parsed.success) {
    return Response.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const { page, limit, status, plan } = parsed.data;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = getServiceClient()
    .schema("platform")
    .from("tenants")
    .select("*", { count: "exact" })
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status !== undefined) {
    query = query.eq("status", status as TenantStatus);
  }
  if (plan !== undefined) {
    query = query.eq("plan", plan);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("List tenants:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }

  return Response.json({
    data: data ?? [],
    total: count ?? 0,
    page,
    limit,
  });
}

export async function POST(request: Request): Promise<Response> {
  const authError = requireAdminToken(request);
  if (authError) {
    return authError;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CreateTenantSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const { slug, owner_email, plan, stripe_customer_id } = parsed.data;

  try {
    const result = await provisionTenant({
      slug,
      owner_email,
      plan,
      stripe_customer_id,
    });
    return Response.json(
      { id: result.id, slug: result.slug, status: result.status },
      { status: 202 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create tenant";
    if (isUniqueViolation(message, (err as { code?: string }).code)) {
      return Response.json({ error: "Slug already exists" }, { status: 409 });
    }
    console.error("POST /tenants:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
