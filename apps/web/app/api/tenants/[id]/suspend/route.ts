import { createHash } from "node:crypto";
import { z } from "zod";
import { getTenantComposePath, stopTenant } from "../../../../../lib/docker/container-manager";
import { adminClient } from "../../../../../lib/supabase/admin";

const idParamSchema = z.string().uuid();

function actorFromBearer(request: Request): string {
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length).trim() : "";
  if (!token) {
    return "unknown";
  }
  const digest = createHash("sha256").update(token).digest("hex");
  return `token:${digest.slice(0, 24)}`;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return Response.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  const { data: tenant, error: fetchError } = await adminClient
    .schema("platform")
    .from("tenants")
    .select("id, slug")
    .eq("id", idParsed.data)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }
  if (!tenant) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const composePath = getTenantComposePath(tenant.slug);
  await stopTenant(tenant.slug, composePath).catch(() => undefined);

  const { error: updateError } = await adminClient
    .schema("platform")
    .from("tenants")
    .update({ status: "suspended" })
    .eq("id", tenant.id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  const actor = actorFromBearer(request);
  const { error: auditError } = await adminClient.schema("platform").from("audit_log").insert({
    tenant_id: tenant.id,
    action: "suspended",
    actor,
    metadata: { slug: tenant.slug },
  });

  if (auditError) {
    return Response.json({ error: auditError.message }, { status: 500 });
  }

  return Response.json({ success: true as const });
}
