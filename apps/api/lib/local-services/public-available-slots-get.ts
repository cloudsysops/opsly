import type { NextRequest } from 'next/server';
import { HTTP_STATUS, LOCAL_SERVICES_PUBLIC } from '../constants';
import { assertLocalServicesTenantPublic } from '../local-services-public';
import { lsGetServiceByExternalKey } from '../repositories/local-services-repository';
import { computeTechnicianSlots } from '../technician-available-slots';
import { isTechnicianTenantMetadata } from '../technician-tenant-profile';
import { fetchTenantMetadataBySlug } from '../tenant-metadata';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDateAndServiceQuery(
  request: NextRequest
): Response | { date: string; serviceExternalId: string } {
  const url = new URL(request.url);
  const date = url.searchParams.get('date')?.trim() ?? '';
  const serviceExternalId =
    url.searchParams.get('service_external_id')?.trim() ??
    url.searchParams.get('serviceType')?.trim() ??
    '';

  if (!DATE_RE.test(date)) {
    return Response.json(
      { error: 'invalid_date', message: 'Use date=YYYY-MM-DD' },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }
  if (serviceExternalId.length === 0) {
    return Response.json(
      { error: 'missing_service_external_id' },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  return { date, serviceExternalId };
}

/**
 * GET público: slots disponibles para día + servicio.
 */
export async function getPublicAvailableSlots(
  request: NextRequest,
  slug: string
): Promise<Response> {
  const gate = await assertLocalServicesTenantPublic(slug);
  if (gate !== null) {
    return gate;
  }

  const metadata = await fetchTenantMetadataBySlug(slug);
  if (metadata === null || !isTechnicianTenantMetadata(metadata)) {
    return Response.json({ error: 'not_technician_tenant' }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  const parsed = parseDateAndServiceQuery(request);
  if (parsed instanceof Response) {
    return parsed;
  }

  const { date, serviceExternalId } = parsed;
  const svc = await lsGetServiceByExternalKey({ tenantSlug: slug, externalKey: serviceExternalId });
  if (svc === null) {
    return Response.json({ error: 'service_not_found' }, { status: HTTP_STATUS.NOT_FOUND });
  }

  const duration = svc.duration_minutes ?? LOCAL_SERVICES_PUBLIC.DEFAULT_SERVICE_DURATION_MINUTES;
  const d = new Date(`${date}T12:00:00.000Z`);
  const dayOfWeek = d.getUTCDay();

  const slots = await computeTechnicianSlots({
    tenantSlug: slug,
    dateOnly: date,
    dayOfWeek,
    slotStepMinutes: LOCAL_SERVICES_PUBLIC.SLOT_STEP_MINUTES,
    serviceDurationMinutes: duration,
  });

  return Response.json({ date, service_external_id: serviceExternalId, slots });
}
