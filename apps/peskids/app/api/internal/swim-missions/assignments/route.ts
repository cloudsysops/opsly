import type { NextRequest } from 'next/server';
import {
  automationInputIsGoverned,
  createSwimMissionAssignmentSchema,
} from '@/lib/swim-missions';
import { verifyPeskidsInternalRequest } from '@/lib/internal-auth';
import { createSwimMissionAssignment } from '@/lib/services/swim-mission.service';
import { errorJson, internalErrorJson, resolveRequestId, successJson } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  if (!verifyPeskidsInternalRequest(req)) {
    return errorJson(requestId, 'Unauthorized', 401);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const parsed = createSwimMissionAssignmentSchema.safeParse(body);
  if (!parsed.success) return errorJson(requestId, 'Invalid payload', 422);

  if (!automationInputIsGoverned(parsed.data)) {
    return errorJson(
      requestId,
      'Automation requires mode, rule_id, workflow_id and idempotency_key',
      400
    );
  }

  try {
    const assignment = await createSwimMissionAssignment(parsed.data, {
      source: 'automation',
      userId: null,
    });
    return successJson(requestId, { ok: true, assignment }, 201);
  } catch (error) {
    return internalErrorJson(
      requestId,
      'internal.swim-missions.assignments.post',
      error,
      'Unable to assign swim mission'
    );
  }
}
