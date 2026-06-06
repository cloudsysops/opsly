import { NextRequest } from 'next/server';
import { tenantRoleFromUserMetadata } from '@/lib/runtime/tenant-identity';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import { createClassSchema } from '@/lib/validation/class.schema';
import { ClassScheduleConflictError } from '@/lib/class-types';
import { createClass, listClasses, listPools } from '@/lib/services/class.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const from =
    req.nextUrl.searchParams.get('from') ??
    new Date().toISOString();
  const to =
    req.nextUrl.searchParams.get('to') ??
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const professorParam = req.nextUrl.searchParams.get('professor_user_id');
  const role = auth.user ? tenantRoleFromUserMetadata(auth.user) : null;
  let professorUserId = professorParam ?? undefined;

  if (role === 'teacher' && auth.user) {
    professorUserId = auth.user.id;
  }

  try {
    const [classes, pools] = await Promise.all([
      listClasses({
        from,
        to,
        professorUserId,
        poolId: req.nextUrl.searchParams.get('pool_id') ?? undefined,
        status: req.nextUrl.searchParams.get('status') ?? undefined,
      }),
      listPools(),
    ]);

    return successJson(requestId, { ok: true, classes, pools });
  } catch (err) {
    console.error('[GET /api/admin/classes]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to list classes', 500);
  }
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  if (auth.user && !isAdminSurfaceUser(auth.user)) {
    return errorJson(requestId, 'Forbidden', 403);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const parsed = createClassSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }

  try {
    const created = await createClass(parsed.data, auth.user?.id ?? null);
    return successJson(requestId, { ok: true, class: created }, 201);
  } catch (err) {
    if (err instanceof ClassScheduleConflictError) {
      return errorJson(requestId, err.message, 409);
    }
    console.error('[POST /api/admin/classes]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to create class', 500);
  }
}
