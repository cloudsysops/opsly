import { requireAdminAccess } from '../../../../../../../../lib/auth';
import { HTTP_STATUS } from '@intcloudsysops/constants';
import { logger } from '../../../../../../../../lib/logger';
import {
  approveMessage,
  rejectMessage,
} from '../../../../../../../../lib/peskids/messages';
import { peskidsMessageApprovalSchema } from '../../../../../../../../lib/peskids/schemas';

const PESKIDS_TENANT_SLUG = 'peskids';

export async function POST(
  request: Request,
  context: { params: Promise<{ slug: string; messageId: string }> }
): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth !== null) {
    return auth;
  }

  const { slug, messageId } = await context.params;
  if (slug !== PESKIDS_TENANT_SLUG) {
    return Response.json({ error: 'Not found' }, { status: HTTP_STATUS.NOT_FOUND });
  }

  const requestId =
    request.headers.get('x-request-id')?.trim() || globalThis.crypto.randomUUID();
  const approvedBy = request.headers.get('x-admin-user')?.trim() || 'admin';

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json(
      { error: 'Invalid JSON body', request_id: requestId },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  const parsed = peskidsMessageApprovalSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'Invalid request body',
        details: parsed.error.flatten(),
        request_id: requestId,
      },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  const { approved, modified_response, rejection_reason } = parsed.data;

  try {
    if (approved) {
      const result = await approveMessage(
        messageId,
        slug,
        approvedBy,
        modified_response
      );

      if (!result.ok) {
        logger.error('peskids.admin.messages.approve_failed', {
          messageId,
          slug,
          requestId,
          error: result.error,
        });
        return Response.json(
          { error: result.error, request_id: requestId, ok: false },
          { status: HTTP_STATUS.INTERNAL_ERROR }
        );
      }

      logger.info('peskids.admin.messages.approved', {
        messageId,
        slug,
        approvedBy,
        requestId,
        sent_at: result.sent_at,
      });

      return Response.json(
        {
          ok: true,
          approved: true,
          sent_at: result.sent_at,
          request_id: requestId,
        },
        { status: HTTP_STATUS.OK }
      );
    }

    const rejectResult = await rejectMessage(
      messageId,
      slug,
      approvedBy,
      rejection_reason
    );

    if (!rejectResult.ok) {
      return Response.json(
        { error: rejectResult.error, request_id: requestId, ok: false },
        { status: HTTP_STATUS.INTERNAL_ERROR }
      );
    }

    logger.info('peskids.admin.messages.rejected', {
      messageId,
      slug,
      approvedBy,
      requestId,
      reason: rejection_reason,
    });

    return Response.json(
      {
        ok: true,
        approved: false,
        request_id: requestId,
      },
      { status: HTTP_STATUS.OK }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error('peskids.admin.messages.approve_exception', {
      messageId,
      slug,
      requestId,
      error: message,
    });
    return Response.json(
      { error: `approval_failed: ${message}`, request_id: requestId },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }
}
