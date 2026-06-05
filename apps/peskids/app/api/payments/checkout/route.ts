import { NextRequest } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateFamilyRequest } from '@/lib/family-auth';
import { checkoutSchema } from '@/lib/validation/class.schema';
import { createCheckoutForEnrollment } from '@/lib/services/payment.service';

export const dynamic = 'force-dynamic';

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

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return errorJson(requestId, 'Invalid payload', 400);
  }

  try {
    const checkout = await createCheckoutForEnrollment({
      enrollmentId: parsed.data.enrollment_id,
      familyUserId: auth.user.id,
    });
    return successJson(requestId, { ok: true, ...checkout });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Checkout failed';
    console.error('[POST /api/payments/checkout]', err, { request_id: requestId });
    return errorJson(requestId, message, 502);
  }
}
