import { NextResponse } from "next/server";
import { getDb, requireAdminToken } from "../../../../lib/_utils";
import { getInsightsForTenant, markInsightRead, markInsightActioned } from "../../../../lib/insights/engine";
import { HTTP_STATUS } from "../../../../lib/constants";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ ref: string }>
) {
  const { ref } = await params;

  await requireAdminToken(request);

  const db = getDb();
  const { data: tenant } = await db
    .schema("platform")
    .from("tenants")
    .select("id, slug")
    .or(`id.eq.${ref},slug.eq.${ref}`)
    .single();

  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: HTTP_STATUS.NOT_FOUND });
  }

  const insights = await getInsightsForTenant(tenant.id);

  return NextResponse.json({
    tenant_slug: tenant.slug,
    insights,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ref: string }> }
) {
  const { ref } = await params;
  const body = await request.json();
  const { insight_id, action } = body;

  if (!insight_id || !action) {
    return NextResponse.json(
      { error: "insight_id and action required" },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  try {
    if (action === "read") {
      await markInsightRead(insight_id);
    } else if (action === "action") {
      await markInsightActioned(insight_id);
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: "Failed to update insight" },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}