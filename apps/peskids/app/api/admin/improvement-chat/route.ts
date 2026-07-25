import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import { isPeskidsStaffImprovementChatEnabled } from '@/lib/peskids-pro-flags';
import { createImprovementMessageSchema } from '@/lib/validation/improvement-chat.schema';
import {
  createStaffMessageAndAnalyze,
  listImprovementMessages,
} from '@/lib/services/improvement-chat.service';

export const dynamic = 'force-dynamic';

function requireAdminSurface(
  auth: Awaited<ReturnType<typeof validateStaffRequest>>
): { ok: true } | { ok: false; status: number; error: string } {
  if (!auth.ok) {
    return { ok: false, status: auth.status, error: auth.error };
  }
  if (auth.method === 'secret') {
    return { ok: true };
  }
  if (auth.user && !isAdminSurfaceUser(auth.user)) {
    return { ok: false, status: 403, error: 'Forbidden' };
  }
  return { ok: true };
}

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  const gate = requireAdminSurface(auth);
  if (!gate.ok) {
    return errorJson(requestId, gate.error, gate.status);
  }

  if (!isPeskidsStaffImprovementChatEnabled()) {
    return errorJson(requestId, 'Improvement chat is not enabled', 404);
  }

  try {
    const messages = await listImprovementMessages();
    return successJson(requestId, { ok: true, messages });
  } catch (err) {
    console.error('[GET /api/admin/improvement-chat]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to list improvement chat messages', 500);
  }
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  const gate = requireAdminSurface(auth);
  if (!gate.ok) {
    return errorJson(requestId, gate.error, gate.status);
  }

  if (!isPeskidsStaffImprovementChatEnabled()) {
    return errorJson(requestId, 'Improvement chat is not enabled', 404);
  }

  try {
    const json = await req.json();
    const parsed = createImprovementMessageSchema.safeParse(json);
    if (!parsed.success) {
      return errorJson(requestId, parsed.error.issues[0]?.message ?? 'Invalid input', 400);
    }

    const authorEmail = auth.ok && auth.method === 'supabase' ? (auth.user?.email ?? null) : null;

    const { staffMessage, assistantMessage } = await createStaffMessageAndAnalyze({
      body: parsed.data.body,
      authorEmail,
    });

    return successJson(requestId, { ok: true, staffMessage, assistantMessage }, 201);
  } catch (err) {
    console.error('[POST /api/admin/improvement-chat]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to send message', 500);
  }
}
