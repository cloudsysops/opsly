import { z } from "zod";
import { requireAdminToken } from "../../../lib/auth";
import { formatZodError } from "../../../lib/validation";
import { sendPortalInvitationForTenant } from "../../../lib/portal-invitations";
import { getServiceClient } from "../../../lib/supabase";

const MAX_NAME_LENGTH = 200;

const InvitationBodySchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]{3,30}$/),
  email: z.string().email(),
  name: z.string().min(1).max(MAX_NAME_LENGTH),
});

export async function POST(request: Request): Promise<Response> {
  const authError = requireAdminToken(request);
  if (authError) {
    return authError;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = InvitationBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: formatZodError(parsed.error) }, { status: 400 });
  }

  const { slug, email, name } = parsed.data;
  const emailNorm = email.toLowerCase();

  const { data: tenant, error } = await getServiceClient()
    .schema("platform")
    .from("tenants")
    .select("id, slug, name, owner_email, status")
    .eq("slug", slug)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("invitations tenant lookup:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
  if (!tenant) {
    return Response.json({ error: "Tenant not found" }, { status: 404 });
  }
  if (tenant.owner_email.toLowerCase() !== emailNorm) {
    return Response.json(
      { error: "Email does not match tenant owner" },
      { status: 403 },
    );
  }

  try {
    await sendPortalInvitationForTenant({
      email,
      name,
      slug: tenant.slug,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invite failed";
    console.error("sendPortalInvitationForTenant:", err);
    return Response.json({ error: message }, { status: 500 });
  }

  return Response.json({ ok: true, tenant_id: tenant.id });
}
