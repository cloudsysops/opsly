/**
 * POST /api/admin/peskids/[slug]/whatsapp/messages/[messageId]/approve
 * POST /api/admin/peskids/[slug]/whatsapp/messages/[messageId]/reject
 * Approve or reject pending message
 */

import type { NextRequest } from 'next/server';
import { parseJsonBody, jsonError, jsonSuccess } from '@/lib/api-response';
import { HTTP_STATUS } from '@intcloudsysops/constants';
import { approveMessage, rejectMessage } from '../../../../../../../../../../../lib/whatsapp-approval';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; messageId: string } }
): Promise<Response> {
  const { slug, messageId } = params;
  const url = new URL(request.url);
  const action = url.pathname.includes('/approve') ? 'approve' : 'reject';

  if (slug !== 'peskids') {
    return jsonError('Invalid tenant', HTTP_STATUS.FORBIDDEN);
  }

  const bodyParsed = await parseJsonBody(request);
  if (!bodyParsed.ok) {
    return bodyParsed.response;
  }

  const body = bodyParsed.body as { approved_by?: string; reason?: string };

  try {
    let result;

    if (action === 'approve') {
      result = await approveMessage(messageId, 'peskids', body.approved_by || 'unknown');
    } else {
      result = await rejectMessage(messageId, 'peskids', body.approved_by || 'unknown', body.reason);
    }

    if (!result.ok) {
      return jsonError(result.error || 'Action failed', HTTP_STATUS.INTERNAL_SERVER_ERROR);
    }

    return jsonSuccess(
      {
        ok: true,
        message_id: result.messageId,
        status: result.status,
        action,
      },
      HTTP_STATUS.OK
    );
  } catch (err) {
    return jsonError(
      `Failed to ${action} message: ${err instanceof Error ? err.message : 'Unknown error'}`,
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}
