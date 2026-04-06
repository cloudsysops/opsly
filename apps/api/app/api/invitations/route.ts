import { z } from "zod";
import { requireAdminToken } from "../../../lib/auth";
import { executeAdminInvitation } from "../../../lib/invitation-admin-flow";
import { formatZodError } from "../../../lib/validation";

const MAX_NAME_LENGTH = 200;

const slugPattern = /^[a-z0-9-]{3,30}$/;

const InvitationBodySchema = z
  .object({
    slug: z.string().regex(slugPattern).optional(),
    tenantRef: z.string().regex(slugPattern).optional(),
    email: z.string().email(),
    name: z.string().min(1).max(MAX_NAME_LENGTH).optional(),
    mode: z.enum(["developer", "managed"]).optional(),
  })
  .refine((b) => Boolean(b.slug ?? b.tenantRef), {
    message: "Provide slug or tenantRef",
    path: ["slug"],
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
    return Response.json(
      { error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  return executeAdminInvitation(parsed.data);
}
