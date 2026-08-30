import { requireAdminAccess } from '../../../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import { logger } from '../../../../../../../lib/logger';
import { fetchPendingMessages } from '../../../../../../../lib/peskids/messages';

const PESKIDS_TENANT_SLUG = 'peskids';

export async function GET(
  request: Request,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth !== null) {
    return auth;
  }

  const { slug } = await context.params;
  if (slug !== PESKIDS_TENANT_SLUG) {
    return Response.json({ error: 'Not found' }, { status: HTTP_STATUS.NOT_FOUND });
  }

  const requestId = request.headers.get('x-request-id')?.trim() || globalThis.crypto.randomUUID();

  try {
    const result = await fetchPendingMessages(slug);
    if (!result.ok) {
      logger.error('peskids.admin.messages.pending_error', {
        slug,
        requestId,
        error: result.error,
      });
      return Response.json(
        { error: result.error, request_id: requestId },
        { status: HTTP_STATUS.INTERNAL_ERROR }
      );
    }

    return Response.json(
      {
        ok: true,
        request_id: requestId,
        messages: result.messages,
        count: result.messages.length,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('peskids.admin.messages.pending_exception', {
      slug,
      requestId,
      error: message,
    });
    return Response.json(
      { error: `failed_to_fetch_pending_messages: ${message}`, request_id: requestId },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}
