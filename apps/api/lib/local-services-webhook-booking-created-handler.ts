import { HTTP_STATUS } from './constants';
import type { LocalServicesWebhookHandlerResult } from './local-services-webhook-handler';
import { lsWebhookBookingBodySchema } from './local-services-webhook-schema';
import { lsGetBookingByIdForTenantSlug } from './repositories/local-services-repository';

export async function handleLocalServicesWebhookBookingCreated(
  slug: string,
  body: unknown
): Promise<LocalServicesWebhookHandlerResult> {
  const parsed = lsWebhookBookingBodySchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: HTTP_STATUS.BAD_REQUEST }
      ),
    };
  }

  const row = await lsGetBookingByIdForTenantSlug({
    tenantSlug: slug,
    bookingId: parsed.data.booking_id,
  });
  if (row === null) {
    return {
      ok: false,
      response: Response.json({ error: 'Booking not found' }, { status: HTTP_STATUS.NOT_FOUND }),
    };
  }

  return {
    ok: true,
    response: Response.json({
      ok: true,
      tenant_slug: slug,
      booking_id: row.id,
      status: row.status,
    }),
  };
}
