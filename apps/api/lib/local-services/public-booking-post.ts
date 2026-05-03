import type { NextRequest } from 'next/server';
import { HTTP_STATUS } from '../constants';
import { publicBookBodySchema } from '../local-services-booking-schema';
import { assertLocalServicesTenantPublic } from '../local-services-public';
import {
  lsInsertBookingForTenantSlug,
  lsResolveServiceIdByExternalKey,
} from '../repositories/local-services-repository';
import { addressMentionsAllowedState } from '../technician-service-area';
import {
  isTechnicianTenantMetadata,
  technicianAllowedStatesFromMetadata,
} from '../technician-tenant-profile';
import type { Json } from '../supabase/types';
import { fetchTenantMetadataBySlug } from '../tenant-metadata';
import type { z } from 'zod';

type PublicBookBody = z.infer<typeof publicBookBodySchema>;

type PublicBookingReady = {
  body: PublicBookBody;
  serviceId: string | null;
  technician: boolean;
};

async function readJsonBody(request: NextRequest): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
}

function externalIdRequiresTechnicianError(
  hasExternalId: boolean,
  technician: boolean
): Response | null {
  if (hasExternalId && !technician) {
    return Response.json(
      { error: 'service_external_id is only valid for technician local-services tenants' },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }
  return null;
}

async function resolveTechnicianServiceIdOrError(
  slug: string,
  body: PublicBookBody,
  metadata: Json
): Promise<Response | string> {
  if (
    body.service_external_id === undefined ||
    body.address === undefined ||
    body.scheduled_at === undefined
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
  if (!addressMentionsAllowedState(body.address, statesUpper)) {
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
    externalKey: body.service_external_id,
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
  return resolved;
}

async function validatePublicBookingPayload(
  slug: string,
  raw: unknown
): Promise<Response | PublicBookingReady> {
  const parsed = publicBookBodySchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid request body', details: parsed.error.flatten() },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  const metadata = await fetchTenantMetadataBySlug(slug);
  const technician = metadata !== null && isTechnicianTenantMetadata(metadata);

  const extErr = externalIdRequiresTechnicianError(
    parsed.data.service_external_id !== undefined,
    technician
  );
  if (extErr !== null) {
    return extErr;
  }

  let serviceId: string | null = parsed.data.service_id ?? null;

  if (technician && metadata !== null) {
    const resolvedOrErr = await resolveTechnicianServiceIdOrError(slug, parsed.data, metadata);
    if (resolvedOrErr instanceof Response) {
      return resolvedOrErr;
    }
    serviceId = resolvedOrErr;
  }

  return { body: parsed.data, serviceId, technician };
}

async function persistPublicBooking(slug: string, ready: PublicBookingReady): Promise<Response> {
  const { body, serviceId, technician } = ready;
  const inserted = await lsInsertBookingForTenantSlug({
    tenantSlug: slug,
    customerName: body.customer_name,
    customerEmail: body.customer_email,
    customerPhone: body.customer_phone,
    serviceId,
    scheduledAt: body.scheduled_at ?? null,
    notes: body.notes,
    serviceLocation: body.service_location ?? (technician ? 'home' : null),
    address: body.address ?? null,
    latitude: body.latitude ?? null,
    longitude: body.longitude ?? null,
    estimatedTravelTimeMinutes: body.estimated_travel_time_minutes ?? null,
    equipmentNeeded: body.equipment_needed ?? null,
  });

  if (!inserted.ok) {
    return Response.json({ error: inserted.error }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }

  return Response.json(
    { ok: true, booking_id: inserted.id, tenant_slug: slug },
    { status: HTTP_STATUS.CREATED }
  );
}

/**
 * POST público: reserva bajo slug (sin JWT).
 */
export async function postPublicLocalServicesBooking(
  request: NextRequest,
  slug: string
): Promise<Response> {
  const gate = await assertLocalServicesTenantPublic(slug);
  if (gate !== null) {
    return gate;
  }

  const raw = await readJsonBody(request);
  if (raw instanceof Response) {
    return raw;
  }

  const ready = await validatePublicBookingPayload(slug, raw);
  if (ready instanceof Response) {
    return ready;
  }

  return persistPublicBooking(slug, ready);
}
