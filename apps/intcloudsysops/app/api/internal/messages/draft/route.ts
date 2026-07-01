import { NextRequest } from 'next/server';
import { storeDraftReply } from '@/lib/message-store';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

function internalSecret(): string | undefined {
  return (
    process.env.PESKIDS_INTERNAL_SECRET ||
    process.env.PESKIDS_INBOUND_WEBHOOK_SECRET ||
    process.env.JELOU_WEBHOOK_SECRET
  );
}

function verifyInternal(req: NextRequest): boolean {
  const secret = internalSecret();
  if (!secret) return false;
  const header = req.headers.get('x-internal-secret') || req.headers.get('x-webhook-secret') || '';
  return header === secret;
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);

  if (!verifyInternal(req)) {
    return errorJson(requestId, 'Unauthorized', 401);
  }

  const body = (await req.json()) as {
    parent_message_id?: string;
    draft_text?: string;
    source?: 'whatsapp' | 'instagram' | 'web';
  };

  const parentId = body.parent_message_id?.trim();
  const draftText = body.draft_text?.trim();
  const source = body.source ?? 'whatsapp';

  if (!parentId || !draftText) {
    return errorJson(requestId, 'parent_message_id and draft_text required', 400);
  }

  const { draft, error } = await storeDraftReply(parentId, draftText, source);
  if (error || !draft) {
    return errorJson(requestId, error ?? 'Failed to store draft', 500);
  }

  return successJson(requestId, { ok: true, draft }, 201);
}
