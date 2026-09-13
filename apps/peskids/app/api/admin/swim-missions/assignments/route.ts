import type { NextRequest } from 'next/server';
import { createSwimMissionAssignmentSchema, assignmentSourceForStaffRole } from '@/lib/swim-missions';
import { tenantRoleFromUserMetadata } from '@/lib/runtime/tenant-identity';
import { validateStaffRequest } from '@/lib/staff-auth';
import {
  createSwimMissionAssignment,
  listStudentSwimAssignments,
} from '@/lib/services/swim-mission.service';
import { errorJson, internalErrorJson, resolveRequestId, successJson } from '@/lib/api-response';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);

  const studentId = req.nextUrl.searchParams.get('student_id')?.trim() ?? '';
  if (!studentId) return errorJson(requestId, 'student_id is required', 400);

  try {
    const assignments = await listStudentSwimAssignments(studentId);
    return successJson(requestId, { ok: true, assignments });
  } catch (error) {
    return internalErrorJson(
      requestId,
      'admin.swim-missions.assignments.get',
      error,
      'Unable to load swim missions'
    );
  }
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) return errorJson(requestId, auth.error, auth.status);

  const role =
    auth.method === 'secret'
      ? 'admin'
      : tenantRoleFromUserMetadata(auth.user);
  const source = assignmentSourceForStaffRole(role);
  if (!source) return errorJson(requestId, 'Forbidden', 403);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const parsed = createSwimMissionAssignmentSchema.safeParse(body);
  if (!parsed.success) return errorJson(requestId, 'Invalid payload', 422);

  if (parsed.data.assignment_mode !== 'manual') {
    return errorJson(
      requestId,
      'Staff assignment endpoint accepts manual assignments only',
      400
    );
  }

  try {
    const assignment = await createSwimMissionAssignment(parsed.data, {
      source,
      userId: auth.method === 'supabase' ? auth.user?.id ?? null : null,
    });
    return successJson(requestId, { ok: true, assignment }, 201);
  } catch (error) {
    return internalErrorJson(
      requestId,
      'admin.swim-missions.assignments.post',
      error,
      'Unable to assign swim mission'
    );
  }
}
