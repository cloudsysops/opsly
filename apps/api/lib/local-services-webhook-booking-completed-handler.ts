import { HTTP_STATUS } from './constants';
import type { LocalServicesWebhookHandlerResult } from './local-services-webhook-handler';
import { lsWebhookBookingCompletedBodySchema } from './local-services-webhook-schema';
import {
  lsGetBookingByIdForTenantSlug,
  lsSetBookingStatusForTenantSlug,
} from './repositories/local-services-repository';

export async function handleLocalServicesWebhookBookingCompleted(
  slug: string,
  body: unknown
): Promise<LocalServicesWebhookHandlerResult> {
  const parsed = lsWebhookBookingCompletedBodySchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: HTTP_STATUS.BAD_REQUEST }
      ),
    };
  }

  const existing = await lsGetBookingByIdForTenantSlug({
    tenantSlug: slug,
    bookingId: parsed.data.booking_id,
  });
  if (existing === null) {
    return {
      ok: false,
      response: Response.json({ error: 'Booking not found' }, { status: HTTP_STATUS.NOT_FOUND }),
    };
  }

  const updated = await lsSetBookingStatusForTenantSlug({
    tenantSlug: slug,
    bookingId: parsed.data.booking_id,
    status: 'completed',
  });
  if (!updated.ok) {
    return {
      ok: false,
      response: Response.json({ error: 'Update failed' }, { status: HTTP_STATUS.INTERNAL_ERROR }),
    };
  }

  return {
    ok: true,
    response: Response.json({
      ok: true,
      tenant_slug: slug,
      booking_id: parsed.data.booking_id,
      status: 'completed' as const,
    }),
  };
}
