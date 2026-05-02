import type { NextRequest } from 'next/server';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import { publicBookBodySchema } from '../../../../../../../lib/local-services-booking-schema';
import { assertLocalServicesTenantPublic } from '../../../../../../../lib/local-services-public';
import { lsInsertBookingForTenantSlug } from '../../../../../../../lib/repositories/local-services-repository';

/**
 * POST /api/local-services/public/tenants/{slug}/bookings
 * Public booking (no JWT). Tenant must exist and be active.
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;

  const gate = await assertLocalServicesTenantPublic(slug);
  if (gate !== null) {
    return gate;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  const parsed = publicBookBodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  const inserted = await lsInsertBookingForTenantSlug({
    tenantSlug: slug,
    customerName: parsed.data.customer_name,
    customerEmail: parsed.data.customer_email,
    customerPhone: parsed.data.customer_phone,
    serviceId: parsed.data.service_id,
    scheduledAt: parsed.data.scheduled_at,
    notes: parsed.data.notes,
  });

  if (!inserted.ok) {
    return Response.json({ error: inserted.error }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }

  return Response.json(
    { ok: true, booking_id: inserted.id, tenant_slug: slug },
    { status: HTTP_STATUS.CREATED }
  );
}
