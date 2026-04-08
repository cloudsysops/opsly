import { z } from "zod";
import { jsonError, parseJsonBody } from "../../../../lib/api-response";
import { HTTP_STATUS } from "../../../../lib/constants";
import { logger } from "../../../../lib/logger";
import { resolveTrustedPortalSession } from "../../../../lib/portal-trusted-identity";
import { getServiceClient } from "../../../../lib/supabase";
import { formatZodError } from "../../../../lib/validation";

const ModeBodySchema = z.object({
  mode: z.enum(["developer", "managed"]),
});

export async function POST(request: Request): Promise<Response> {
  const trusted = await resolveTrustedPortalSession(request);
  if (!trusted.ok) {
    return trusted.response;
  }
  const { user } = trusted.session;

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) {
    return parsedBody.response;
  }

  const parsed = ModeBodySchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
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
    logger.error("portal mode update", error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, mode: parsed.data.mode });
}
