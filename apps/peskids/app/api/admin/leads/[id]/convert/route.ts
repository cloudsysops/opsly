import { NextRequest, NextResponse } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';
import { isAdminSurfaceUser } from '@/lib/staff-user';
import {
  convertLeadToStudent,
  LeadConvertDuplicateError,
  LeadConvertValidationError,
} from '@/lib/services/lead-conversion.service';
import { leadConvertSchema } from '@/lib/validation/lead-convert.schema';

export const dynamic = 'force-dynamic';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();

  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  if (auth.user && !isAdminSurfaceUser(auth.user)) {
    return errorJson(requestId, 'Forbidden', 403);
  }

  const { id } = await context.params;
  const tenantSlug = (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();

  let rawBody: unknown = {};
  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      rawBody = await req.json();
    } catch {
      return errorJson(requestId, 'Invalid JSON body', 400);
    }
  }

  const parsed = leadConvertSchema.safeParse(rawBody ?? {});
  if (!parsed.success) {
    return errorJson(requestId, parsed.error.issues[0]?.message ?? 'Invalid body', 400);
  }

  try {
    const result = await convertLeadToStudent(id, tenantSlug, parsed.data);
    if (!result) {
      return errorJson(requestId, 'Not found', 404);
    }

    return successJson(
      requestId,
      {
        ok: true,
        student: result.student,
        lead: result.lead,
        created: result.created,
        duplicates: result.duplicates ?? [],
      },
      result.created ? 201 : 200
    );
  } catch (err) {
    if (err instanceof LeadConvertValidationError) {
      return errorJson(requestId, err.message, 400);
    }
    if (err instanceof LeadConvertDuplicateError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'duplicate_candidates',
          message:
            'Hay posibles estudiantes duplicados. Revisa y confirma con force=true si corresponde.',
          duplicates: err.duplicates,
          request_id: requestId,
        },
        { status: 409 }
      );
    }
    console.error('[POST /api/admin/leads/[id]/convert]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to convert lead', 500);
  }
}
