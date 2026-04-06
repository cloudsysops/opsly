import { z } from "zod";
import { jsonError, serverErrorLogged } from "../../../../lib/api-response";
import {
  requireAdminToken,
  requireAdminTokenUnlessDemoRead,
} from "../../../../lib/auth";
import { HTTP_STATUS } from "../../../../lib/constants";
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

async function patchTenantRecord(
  tenantId: string,
  updates: Partial<Pick<Tenant, "name" | "plan">>,
): Promise<Response> {
  const { data, error } = await getServiceClient()
    .schema("platform")
    .from("tenants")
    .update(updates)
    .eq("id", tenantId)
    .is("deleted_at", null)
    .select("*")
    .single();

  if (error) {
    return serverErrorLogged("PATCH tenant:", error);
  }
  if (!data) {
    return jsonError("Tenant not found", HTTP_STATUS.NOT_FOUND);
  }

  return Response.json(data);
}

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
    return jsonError(formatZodError(refParsed.error), HTTP_STATUS.BAD_REQUEST);
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
    return serverErrorLogged("GET tenant:", error);
  }
  if (!tenant) {
    return jsonError("Tenant not found", HTTP_STATUS.NOT_FOUND);
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
    return jsonError(formatZodError(idParsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("Invalid JSON body", HTTP_STATUS.BAD_REQUEST);
  }

  const parsed = UpdateTenantSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  const updates: Partial<Pick<Tenant, "name" | "plan">> = {};
  if (parsed.data.name !== undefined) {
    updates.name = parsed.data.name;
  }
  if (parsed.data.plan !== undefined) {
    updates.plan = parsed.data.plan;
  }

  return patchTenantRecord(idParsed.data, updates);
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
    return jsonError(formatZodError(idParsed.error), HTTP_STATUS.BAD_REQUEST);
  }

  const { data: existing, error: fetchError } = await getServiceClient()
    .schema("platform")
    .from("tenants")
    .select("id")
    .eq("id", idParsed.data)
    .is("deleted_at", null)
    .maybeSingle();

  if (fetchError) {
    return serverErrorLogged("DELETE tenant fetch:", fetchError);
  }
  if (!existing) {
    return jsonError("Tenant not found", HTTP_STATUS.NOT_FOUND);
  }

  try {
    await deleteTenant(idParsed.data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Delete failed";
    if (message === "Tenant not found") {
      return jsonError("Tenant not found", HTTP_STATUS.NOT_FOUND);
    }
    return serverErrorLogged("DELETE tenant:", err);
  }

  return new Response(null, { status: HTTP_STATUS.NO_CONTENT });
}
