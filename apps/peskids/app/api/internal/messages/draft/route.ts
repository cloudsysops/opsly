import { NextRequest } from 'next/server';
import { z } from 'zod';
import { storeDraftReply } from '@/lib/message-store';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { verifyPeskidsInternalRequest } from '@/lib/internal-auth';
import { firstZodErrorMessage } from '@/lib/validation/zod-errors';

const REQUIRED_MESSAGE = 'parent_message_id and draft_text required';

const draftBodySchema = z
  .object({
    parent_message_id: z
      .string({ required_error: REQUIRED_MESSAGE, invalid_type_error: REQUIRED_MESSAGE })
      .trim()
      .min(1, REQUIRED_MESSAGE),
    draft_text: z
      .string({ required_error: REQUIRED_MESSAGE, invalid_type_error: REQUIRED_MESSAGE })
      .trim()
      .min(1, REQUIRED_MESSAGE)
      .max(4000),
    source: z.enum(['whatsapp', 'instagram', 'web']).optional(),
  })
  .strict();

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);

  if (!verifyPeskidsInternalRequest(req)) {
    return errorJson(requestId, 'Unauthorized', 401);
  }

  // An unparseable body used to throw out of the handler, which Next turns into
  // an unstructured 500 (and a stack trace in dev).
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const parsed = draftBodySchema.safeParse(raw);
  if (!parsed.success) {
    return errorJson(requestId, firstZodErrorMessage(parsed.error), 400, 'VALIDATION_ERROR');
  }

  const parentId = parsed.data.parent_message_id;
  const draftText = parsed.data.draft_text;
  const source = parsed.data.source ?? 'whatsapp';

  const { draft, error } = await storeDraftReply(parentId, draftText, source);
  if (error || !draft) {
    return errorJson(requestId, error ?? 'Failed to store draft', 500);
  }

  return successJson(requestId, { ok: true, draft }, 201);
}
