import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../lib/auth";
import { HTTP_STATUS } from "../../../../../lib/constants";
import { getInsightsForTenant } from "../../../../../lib/insights/engine";
import { applyInsightPatchAction } from "../../../../../lib/insights/insight-patch-actions";
import { getServiceClient } from "../../../../../lib/supabase";

async function resolveTenantIdByRef(ref: string): Promise<string | null> {
  const db = getServiceClient();
  const { data: tenant } = await db
    .schema("platform")
    .from("tenants")
    .select("id")
    .or(`id.eq.${ref},slug.eq.${ref}`)
    .single();
  if (!tenant?.id) {
    return null;
  }
  return tenant.id as string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ref: string }> },
): Promise<Response> {
  const { ref } = await params;
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const db = getServiceClient();
  const { data: tenant } = await db
    .schema("platform")
    .from("tenants")
    .select("id, slug")
    .or(`id.eq.${ref},slug.eq.${ref}`)
    .single();

  if (!tenant) {
    return NextResponse.json(
      { error: "Tenant not found" },
      { status: HTTP_STATUS.NOT_FOUND },
    );
  }

  const url = new URL(request.url);
  const includeRead = url.searchParams.get("include_read") === "true";
  const insights = await getInsightsForTenant(tenant.id, {
    includeRead,
    limit: 40,
  });

  return NextResponse.json({
    tenant_slug: tenant.slug,
    insights,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ref: string }> },
): Promise<Response> {
  const { ref } = await params;
  const authError = await requireAdminAccess(request);
  if (authError) {
    return authError;
  }

  const body = (await request.json()) as {
    insight_id?: string;
    action?: string;
  };
  const insightId = body.insight_id?.trim();
  const action = body.action?.trim();

  if (!insightId || !action) {
    return NextResponse.json(
      { error: "insight_id and action required" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  const tenantId = await resolveTenantIdByRef(ref);
  if (!tenantId) {
    return NextResponse.json(
      { error: "Tenant not found" },
      { status: HTTP_STATUS.NOT_FOUND },
    );
  }

  try {
    const applied = await applyInsightPatchAction(action, insightId, tenantId);
    if (!applied) {
      return NextResponse.json(
        { error: "action must be read, dismiss, or action" },
        { status: HTTP_STATUS.BAD_REQUEST },
      );
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to update insight" },
      { status: HTTP_STATUS.INTERNAL_ERROR },
    );
  }
}
