import { z } from "zod";
import { adminClient } from "../../../../../lib/supabase/admin";

const idParamSchema = z.string().uuid();

const tenantHeaderSchema = z.string().uuid();

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const tenantHeader = request.headers.get("x-tenant-id");
  const tenantParsed = tenantHeaderSchema.safeParse(tenantHeader ?? "");
  if (!tenantParsed.success) {
    return Response.json({ error: "Invalid or missing x-tenant-id header" }, { status: 400 });
  }

  const { id } = await context.params;
  const idParsed = idParamSchema.safeParse(id);
  if (!idParsed.success) {
    return Response.json({ error: "Invalid key id" }, { status: 400 });
  }

  const { data: existing, error: fetchError } = await adminClient
    .schema("platform")
    .from("api_keys")
    .select("id")
    .eq("id", idParsed.data)
    .eq("tenant_id", tenantParsed.data)
    .maybeSingle();

  if (fetchError) {
    return Response.json({ error: fetchError.message }, { status: 500 });
  }
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const { error: updateError } = await adminClient
    .schema("platform")
    .from("api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", idParsed.data)
    .eq("tenant_id", tenantParsed.data);

  if (updateError) {
    return Response.json({ error: updateError.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
