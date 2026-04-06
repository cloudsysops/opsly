import { z } from "zod";
import {
  requireAdminToken,
  requireAdminTokenUnlessDemoRead,
} from "../../../../lib/auth";
import { deleteTenant } from "../../../../lib/orchestrator";
import { getTenantStackStatus } from "../../../../lib/docker";
import {
  formatZodError,
  TenantRefParamSchema,
  UpdateTenantSchema,
} from "../../../../lib/validation";
import { getServiceClient } from "../../../../lib/supabase";
import type { Tenant } from "../../../../lib/supabase/types";

const idParamSchema = z.string().uuid();

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authError = requireAdminTokenUnlessDemoRead(request);
  if (authError) {
    return authError;
  }

  const { id } = await context.params;
  const refParsed = TenantRefParamSchema.safeParse(id);
  if (!refParsed.success) {
    return Response.json(
      { error: formatZodError(refParsed.error) },
      { status: 400 },
    );
  }

  const ref = refParsed.data;
  const byId = z.string().uuid().safeParse(ref).success;

  const { data: tenant, error } = await getServiceClient()
    .schema("platform")
    .from("tenants")
    .select("*")
    .is("deleted_at", null)
    .eq(byId ? "id" : "slug", ref)
    .maybeSingle();

  if (error) {
    console.error("GET tenant:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
  if (!tenant) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }

  const stackStatus = await getTenantStackStatus(tenant.slug);

  return Response.json({
    tenant,
    stack_status: stackStatus,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authError = requireAdminToken(request);
  if (authError) {
    return authError;
  }

  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return Response.json(
      { error: formatZodError(idParsed.error) },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = UpdateTenantSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const updates: Partial<Pick<Tenant, "name" | "plan">> = {};
  if (parsed.data.name !== undefined) {
    updates.name = parsed.data.name;
  }
  if (parsed.data.plan !== undefined) {
    updates.plan = parsed.data.plan;
  }

  const { data, error } = await getServiceClient()
    .schema("platform")
    .from("tenants")
    .update(updates)
    .eq("id", idParsed.data)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) {
    console.error("PATCH tenant:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
  if (!data) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }

  return Response.json(data);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authError = requireAdminToken(request);
  if (authError) {
    return authError;
  }

  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return Response.json(
      { error: formatZodError(idParsed.error) },
      { status: 400 },
    );
  }

  const { data: existing, error: fetchError } = await getServiceClient()
    .schema("platform")
    .from("tenants")
    .select("id")
    .eq("id", idParsed.data)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    console.error("DELETE tenant fetch:", fetchError);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
  if (!existing) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }

  try {
    await deleteTenant(idParsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    if (message === "Tenant not found") {
      return Response.json({ error: "Tenant not found" }, { status: 404 });
    }
    console.error("DELETE tenant:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
