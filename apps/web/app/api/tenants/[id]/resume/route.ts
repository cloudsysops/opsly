import { z } from "zod";
import {
  resolveTenantComposePath,
  startTenant,
} from "../../../../../lib/docker/container-manager";
import { pollPortsUntilHealthy } from "../../../../../lib/onboarding/orchestrator";
import { adminClient } from "../../../../../lib/supabase/admin";

const idParamSchema = z.string().uuid();

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  void request;
  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return Response.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  const { data: tenant, error: fetchError } = await adminClient
    .schema("platform")
    .from("tenants")
    .select("id, slug, status")
    .eq("id", idParsed.data)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }
  if (!tenant) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (tenant.status !== "suspended") {
    return Response.json({ error: "Tenant is not suspended" }, { status: 409 });
  }

  const { error: deployingError } = await adminClient
    .schema("platform")
    .from("tenants")
    .update({ status: "deploying", progress: 50 })
    .eq("id", tenant.id);

  if (deployingError) {
    return Response.json({ error: deployingError.message }, { status: 500 });
  }

  const composePath = await resolveTenantComposePath(tenant.slug);
  try {
    await startTenant(tenant.slug, composePath);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to start containers";
    return Response.json({ error: message }, { status: 500 });
  }

  const { data: portsRows, error: portsError } = await adminClient
    .schema("platform")
    .from("port_allocations")
    .select("port, service")
    .eq("tenant_id", tenant.id);

  if (portsError) {
    return Response.json({ error: portsError.message }, { status: 500 });
  }

  const ports: Record<string, number> = {};
  for (const row of portsRows ?? []) {
    if (row.service === "available") {
      continue;
    }
    ports[row.service] = row.port;
  }

  try {
    await pollPortsUntilHealthy(ports);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Health checks failed";
    return Response.json({ error: message }, { status: 502 });
  }

  const { error: activeError } = await adminClient
    .schema("platform")
    .from("tenants")
    .update({ status: "active", progress: 100 })
    .eq("id", tenant.id);

  if (activeError) {
    return Response.json({ error: activeError.message }, { status: 500 });
  }

  const { error: auditError } = await adminClient.schema("platform").from("audit_log").insert({
    tenant_id: tenant.id,
    action: "resumed",
    actor: "platform_api",
    metadata: { slug: tenant.slug },
  });

  if (auditError) {
    return Response.json({ error: auditError.message }, { status: 500 });
  }

  return Response.json({ success: true as const });
}
