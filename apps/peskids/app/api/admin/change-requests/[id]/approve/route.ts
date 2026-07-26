import { NextRequest } from 'next/server';
import { z } from 'zod';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import { isPeskidsStaffImprovementChatEnabled } from '@/lib/peskids-pro-flags';
import { approveChangeRequest } from '@/lib/services/improvement-chat.service';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

const approveBodySchema = z
  .object({
    operator_notes: z.string().trim().max(4000).nullable().optional(),
  })
  .optional()
  .default({});

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

/**
 * POST /api/admin/change-requests/[id]/approve
 *
 * Human approval only: sets status=approved and generates agent_ticket JSON
 * (context, probable files, acceptance criteria, validation commands, risk).
 *
 * NEVER executes code, WhatsApp, deploy, or any agent run from this endpoint.
 */
export async function POST(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  const gate = requireAdminSurface(auth);
  if (!gate.ok) {
    return errorJson(requestId, gate.error, gate.status);
  }

  if (!isPeskidsStaffImprovementChatEnabled()) {
    return errorJson(requestId, 'Change-request intake is not enabled', 404);
  }

  const { id } = await context.params;

  let raw: unknown = {};
  try {
    const text = await req.text();
    if (text.trim()) {
      raw = JSON.parse(text) as unknown;
    }
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const parsed = approveBodySchema.safeParse(raw);
  if (!parsed.success) {
    return errorJson(requestId, parsed.error.issues[0]?.message ?? 'Invalid payload', 400);
  }

  try {
    const result = await approveChangeRequest(id, {
      operatorNotes: parsed.data.operator_notes,
    });
    if (!result.ok) {
      if (result.error === 'not_found') {
        return errorJson(requestId, 'Not found', 404);
      }
      if (result.error === 'not_staff') {
        return errorJson(requestId, 'Only staff change requests can be approved', 400);
      }
      return errorJson(requestId, 'Request is not in an approvable status', 409);
    }

    return successJson(requestId, {
      ok: true,
      request: result.message,
      agent_ticket: result.agentTicket,
      // Explicit contract for clients/operators.
      execution: 'none',
      note: 'agent_ticket is informational for a later human/agent session — nothing was executed.',
    });
  } catch (err) {
    console.error('[POST /api/admin/change-requests/[id]/approve]', err, {
      request_id: requestId,
    });
    return errorJson(requestId, 'Failed to approve change request', 500);
  }
}
