import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { adminClient } from "../../../../lib/supabase/admin";

const tenantHeaderSchema = z.string().uuid();

const createBodySchema = z.object({
  name: z.string().min(1).optional(),
});

export async function GET(request: Request): Promise<Response> {
  const tenantHeader = request.headers.get("x-tenant-id");
  const tenantParsed = tenantHeaderSchema.safeParse(tenantHeader ?? "");
  if (!tenantParsed.success) {
    return Response.json({ error: "Invalid or missing x-tenant-id header" }, { status: 400 });
  }

  const { data, error } = await adminClient
    .schema("platform")
    .from("api_keys")
    .select("id, key_prefix, name, last_used_at, created_at, revoked_at")
    .eq("tenant_id", tenantParsed.data)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ data: data ?? [] });
}

export async function POST(request: Request): Promise<Response> {
  const tenantHeader = request.headers.get("x-tenant-id");
  const tenantParsed = tenantHeaderSchema.safeParse(tenantHeader ?? "");
  if (!tenantParsed.success) {
    return Response.json({ error: "Invalid or missing x-tenant-id header" }, { status: 400 });
  }

  let body: unknown = {};
  try {
    const raw = await request.text();
    if (raw.length > 0) {
      body = JSON.parse(raw) as unknown;
    }
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = createBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const secretHex = randomBytes(32).toString("hex");
  const fullKey = `opsly_${secretHex}`;
  const key_prefix = `opsly_${secretHex.slice(0, 8)}`;
  const key_hash = createHash("sha256").update(fullKey).digest("hex");

  const { data, error } = await adminClient
    .schema("platform")
    .from("api_keys")
    .insert({
      tenant_id: tenantParsed.data,
      key_hash,
      key_prefix,
      name: parsed.data.name ?? null,
    })
    .select("id, key_prefix, name, created_at")
    .single();

  if (error || !data) {
    return Response.json({ error: error?.message ?? "Failed to create key" }, { status: 500 });
  }

  return Response.json({
    id: data.id,
    key: fullKey,
    key_prefix: data.key_prefix,
    name: data.name,
    created_at: data.created_at,
  });
}
