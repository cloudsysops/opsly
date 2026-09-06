import { NextRequest } from 'next/server';
import { errorJson, internalErrorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateFamilyRequest } from '@/lib/family-auth';
import { checkoutSchema } from '@/lib/validation/class.schema';
import { createCheckoutForEnrollment } from '@/lib/services/payment.service';
import { createWompiPaymentLinkForEnrollment } from '@/lib/services/wompi-payment.service';

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
    const checkout =
      parsed.data.provider === 'wompi'
        ? await createWompiPaymentLinkForEnrollment({
            enrollmentId: parsed.data.enrollment_id,
            familyUserId: auth.user.id,
          })
        : await createCheckoutForEnrollment({
            enrollmentId: parsed.data.enrollment_id,
            familyUserId: auth.user.id,
          });
    return successJson(requestId, { ok: true, provider: parsed.data.provider, ...checkout });
  } catch (err) {
    // Never echo `err.message`: it can carry the raw Stripe/Wompi error body,
    // a PostgREST/SQL error, or a provider key fragment. The real error is
    // logged server-side against the request id instead.
    return internalErrorJson(
      requestId,
      'POST /api/payments/checkout',
      err,
      'No pudimos iniciar el pago. Intenta de nuevo.',
      502
    );
  }
}
