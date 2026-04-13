/* eslint-disable max-lines-per-function, @typescript-eslint/explicit-function-return-type */
import { NextResponse } from "next/server";
import { requireAdminAccess } from "../../../../../lib/auth";
import { HTTP_STATUS } from "../../../../../lib/constants";
import {
  getInsightsForTenant,
  markInsightRead,
  markInsightStatus,
} from "../../../../../lib/insights/engine";
import { getServiceClient } from "../../../../../lib/supabase";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ref: string }> },
) {
  const { ref } = await params;
  const authError = await requireAdminAccess(request);
  if (authError) return authError;

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
) {
  const { ref } = await params;
  const authError = await requireAdminAccess(request);
  if (authError) return authError;

  const body = (await request.json()) as {
    insight_id?: string;
    action?: string;
  };
  const { insight_id, action } = body;

  if (!insight_id || !action) {
    return NextResponse.json(
      { error: "insight_id and action required" },
      { status: HTTP_STATUS.BAD_REQUEST },
    );
  }

  const db = getServiceClient();
  const { data: tenant } = await db
    .schema("platform")
    .from("tenants")
    .select("id")
    .or(`id.eq.${ref},slug.eq.${ref}`)
    .single();

  if (!tenant) {
    return NextResponse.json(
      { error: "Tenant not found" },
      { status: HTTP_STATUS.NOT_FOUND },
    );
  }

  const tenantId = tenant.id as string;

  try {
    if (action === "read") {
      await markInsightRead(insight_id, tenantId);
    } else if (action === "dismiss") {
      await markInsightStatus({
        insightId: insight_id,
        tenantId,
        status: "dismissed",
      });
    } else if (action === "action") {
      await markInsightStatus({
        insightId: insight_id,
        tenantId,
        status: "actioned",
      });
    } else {
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
