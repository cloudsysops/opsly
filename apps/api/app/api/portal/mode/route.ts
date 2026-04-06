import { z } from "zod";
import { getUserFromAuthorizationHeader } from "../../../../lib/portal-auth";
import { formatZodError } from "../../../../lib/validation";
import { getServiceClient } from "../../../../lib/supabase";

const ModeBodySchema = z.object({
  mode: z.enum(["developer", "managed"]),
});

export async function POST(request: Request): Promise<Response> {
  const user = await getUserFromAuthorizationHeader(request);
  if (!user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = ModeBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: formatZodError(parsed.error) },
      { status: 400 },
    );
  }

  const prevMeta =
    user.user_metadata !== null &&
    typeof user.user_metadata === "object" &&
    !Array.isArray(user.user_metadata)
      ? { ...(user.user_metadata as Record<string, unknown>) }
      : {};

  const { error } = await getServiceClient().auth.admin.updateUserById(
    user.id,
    {
      user_metadata: {
        ...prevMeta,
        mode: parsed.data.mode,
      },
    },
  );

  if (error) {
    console.error("portal mode update:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, mode: parsed.data.mode });
}
