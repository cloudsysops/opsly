import type { NextRequest } from 'next/server';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import { publicBookBodySchema } from '../../../../../../../lib/local-services-booking-schema';
import { assertLocalServicesTenantPublic } from '../../../../../../../lib/local-services-public';
import {
  lsInsertBookingForTenantSlug,
  lsResolveServiceIdByExternalKey,
} from '../../../../../../../lib/repositories/local-services-repository';
import { addressMentionsAllowedState } from '../../../../../../../lib/technician-service-area';
import {
  isTechnicianTenantMetadata,
  technicianAllowedStatesFromMetadata,
} from '../../../../../../../lib/technician-tenant-profile';
import { fetchTenantMetadataBySlug } from '../../../../../../../lib/tenant-metadata';

/**
 * POST /api/local-services/public/tenants/{slug}/bookings
 * Public booking (no JWT). Tenant must exist and be active.
 * Technician tenants (metadata.local_services_profile = technician) require
 * service_external_id, address, and scheduled_at; optional Google/Twilio/n8n hooks are not wired here.
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

  const metadata = await fetchTenantMetadataBySlug(slug);
  const technician = metadata !== null && isTechnicianTenantMetadata(metadata);

  if (parsed.data.service_external_id !== undefined && !technician) {
    return Response.json(
      { error: 'service_external_id is only valid for technician local-services tenants' },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  let serviceId: string | null = parsed.data.service_id ?? null;

  if (technician) {
    if (
      parsed.data.service_external_id === undefined ||
      parsed.data.address === undefined ||
      parsed.data.scheduled_at === undefined
    ) {
      return Response.json(
        {
          error: 'technician_booking_requires_fields',
          message: 'Technician bookings require service_external_id, address, and scheduled_at',
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }
    const statesUpper = technicianAllowedStatesFromMetadata(metadata).map((s) => s.toUpperCase());
    if (!addressMentionsAllowedState(parsed.data.address, statesUpper)) {
      return Response.json(
        {
          error: 'service_not_available_in_area',
          message: 'Address must include an allowed service state (e.g. RI, MA, CT).',
        },
        { status: HTTP_STATUS.BAD_REQUEST }
      );
    }
    const resolved = await lsResolveServiceIdByExternalKey({
      tenantSlug: slug,
      externalKey: parsed.data.service_external_id,
    });
    if (resolved === null) {
      return Response.json(
        {
          error: 'service_not_found',
          message: 'Run technician seed for this tenant or check service_external_id',
        },
        { status: HTTP_STATUS.NOT_FOUND }
      );
    }
    serviceId = resolved;
  }

  const inserted = await lsInsertBookingForTenantSlug({
    tenantSlug: slug,
    customerName: parsed.data.customer_name,
    customerEmail: parsed.data.customer_email,
    customerPhone: parsed.data.customer_phone,
    serviceId,
    scheduledAt: parsed.data.scheduled_at ?? null,
    notes: parsed.data.notes,
    serviceLocation: parsed.data.service_location ?? (technician ? 'home' : null),
    address: parsed.data.address ?? null,
    latitude: parsed.data.latitude ?? null,
    longitude: parsed.data.longitude ?? null,
    estimatedTravelTimeMinutes: parsed.data.estimated_travel_time_minutes ?? null,
    equipmentNeeded: parsed.data.equipment_needed ?? null,
  });

  if (!inserted.ok) {
    return Response.json({ error: inserted.error }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }

  return Response.json(
    { ok: true, booking_id: inserted.id, tenant_slug: slug },
    { status: HTTP_STATUS.CREATED }
  );
}
