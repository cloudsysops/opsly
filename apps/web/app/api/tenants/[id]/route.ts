import { z } from "zod";
import {
  getTenantStatus,
  resolveTenantComposePath,
  stopTenant,
} from "../../../../lib/docker/container-manager";
import { adminClient } from "../../../../lib/supabase/admin";
import type { Tenant } from "../../../../lib/supabase/types";

const idParamSchema = z.string().uuid();

const patchBodySchema = z
  .object({
    name: z.string().min(1).optional(),
    plan: z.enum(["startup", "business", "enterprise", "demo"]).optional(),
  })
  .refine((v) => v.name !== undefined || v.plan !== undefined, {
    message: "At least one of name or plan is required",
  });

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  void request;
  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return Response.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  const { data: tenant, error } = await adminClient
    .schema("platform")
    .from("tenants")
    .select("*")
    .eq("id", idParsed.data)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!tenant) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const containerStatus = await getTenantStatus(tenant.slug);

  return Response.json({
    tenant,
    containerStatus,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return Response.json({ error: "Invalid tenant id" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updates: Partial<Pick<Tenant, "name" | "plan">> = {};
  if (parsed.data.name !== undefined) {
    updates.name = parsed.data.name;
  }
  if (parsed.data.plan !== undefined) {
    updates.plan = parsed.data.plan;
  }

  const { data, error } = await adminClient
    .schema("platform")
    .from("tenants")
    .update(updates)
    .eq("id", idParsed.data)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  return Response.json(data);
}

export async function DELETE(
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

  const composePath = await resolveTenantComposePath(tenant.slug);
  await stopTenant(tenant.slug, composePath).catch(() => undefined);

  const { error: updateError } = await adminClient
    .schema("platform")
    .from("tenants")
    .update({
      deleted_at: new Date().toISOString(),
      status: "deleted",
    })
    .eq("id", tenant.id);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
