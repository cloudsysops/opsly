import { NextRequest } from 'next/server';
import { validateStaffSession } from '@/lib/staff-auth';
import {
  handleMessageReply,
  parseMessageReplyAction,
} from '@/lib/message-reply-handler';
import { errorJson, resolveRequestId, successJson } from '../../../../../lib/api-response';

export async function POST(req: NextRequest, context: { params: Promise<{ messageId: string }> }) {
  const requestId = resolveRequestId(req);
  try {
    const auth = await validateStaffSession();
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }

    const { messageId } = await context.params;
    const tenantId = (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();

    if (tenantId !== 'peskids') {
      return errorJson(requestId, 'Forbidden', 403);
    }

    const body = (await req.json()) as { replyText?: unknown; action?: unknown };
    const replyText = typeof body.replyText === 'string' ? body.replyText : '';
    const action = parseMessageReplyAction(body.action);

    const result = await handleMessageReply({
      tenantId,
      messageId,
      replyText,
      action,
    });

    if (!result.ok) {
      return errorJson(requestId, result.error, result.status);
    }

    return successJson(
      requestId,
      {
        ok: true,
        success: true,
        action: result.action,
        status: result.status,
        replyRecord: result.replyRecord,
        n8n: result.n8n,
        meta: result.meta ?? null,
        message: result.message,
      },
      action === 'approve' || action === 'skip' ? 200 : 201
    );
  } catch (error) {
    console.error('Reply API error:', error, { request_id: requestId });
    return errorJson(requestId, 'Failed to process reply', 500);
  }
}
