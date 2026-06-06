import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateFamilyRequest } from '@/lib/family-auth';
import { createEnrollmentSchema } from '@/lib/validation/class.schema';
import {
  ClassCapacityError,
  EnrollmentNotAllowedError,
} from '@/lib/class-types';
import {
  createEnrollment,
  listFamilyEnrollments,
  studentBelongsToFamily,
} from '@/lib/services/enrollment.service';
import { createCheckoutForEnrollment } from '@/lib/services/payment.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateFamilyRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  try {
    const enrollments = await listFamilyEnrollments(auth.user.id);
    return successJson(requestId, { ok: true, enrollments });
  } catch (err) {
    console.error('[GET /api/portal/enrollments]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to list enrollments', 500);
  }
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateFamilyRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const parsed = createEnrollmentSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }

  const allowed = await studentBelongsToFamily(parsed.data.student_id, auth.user);
  if (!allowed) {
    return errorJson(requestId, 'Student not linked to your account', 403);
  }

  try {
    const result = await createEnrollment({
      classId: parsed.data.class_id,
      studentId: parsed.data.student_id,
      familyUserId: auth.user.id,
    });

    if (!result.payment_required) {
      return successJson(
        requestId,
        {
          ok: true,
          enrollment_id: result.enrollment.id,
          payment_required: false,
        },
        201
      );
    }

    try {
      const checkout = await createCheckoutForEnrollment({
        enrollmentId: result.enrollment.id,
        familyUserId: auth.user.id,
      });

      return successJson(
        requestId,
        {
          ok: true,
          enrollment_id: result.enrollment.id,
          payment_required: true,
          checkout_url: checkout.checkout_url,
        },
        201
      );
    } catch (checkoutErr) {
      console.warn('[POST enrollments] checkout unavailable', checkoutErr);
      return successJson(
        requestId,
        {
          ok: true,
          enrollment_id: result.enrollment.id,
          payment_required: true,
          checkout_url: null,
          message: 'Reserva creada. Contacta admin para completar el pago.',
        },
        201
      );
    }
  } catch (err) {
    if (err instanceof ClassCapacityError || err instanceof EnrollmentNotAllowedError) {
      return errorJson(requestId, err.message, 409);
    }
    console.error('[POST /api/portal/enrollments]', err, { request_id: requestId });
    return errorJson(requestId, 'Failed to create enrollment', 500);
  }
}
