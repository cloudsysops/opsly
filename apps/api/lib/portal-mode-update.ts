import { z } from 'zod';
import { jsonError, parseJsonBody } from './api-response';
import { HTTP_STATUS } from './constants';
import { logger } from './logger';
import type { TrustedPortalSession } from './portal-trusted-identity';
import { getServiceClient } from './supabase';
import { formatZodError } from './validation';

const ModeBodySchema = z.object({
  mode: z.enum(['developer', 'managed', 'security_defense']),
});

/**
 * Actualiza `user_metadata.mode` para la sesión portal ya verificada.
 * Compartido por `POST /api/portal/mode` y `POST /api/portal/tenant/[slug]/mode`.
 */
export async function applyPortalModeUpdate(
  session: TrustedPortalSession,
  request: Request
): Promise<Response> {
  const { user } = session;

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
    typeof user.user_metadata === 'object' &&
    !Array.isArray(user.user_metadata)
      ? { ...(user.user_metadata as Record<string, unknown>) }
      : {};

  const { error } = await getServiceClient().auth.admin.updateUserById(user.id, {
    user_metadata: {
      ...prevMeta,
      mode: parsed.data.mode,
    },
  });

  if (error) {
    logger.error('portal mode update', error);
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ ok: true, mode: parsed.data.mode });
}
