import type { NextRequest } from 'next/server';
import { HTTP_STATUS } from '../../../../../../../lib/constants';
import { assertLocalServicesTenantPublic } from '../../../../../../../lib/local-services-public';
import { lsGetServiceByExternalKey } from '../../../../../../../lib/repositories/local-services-repository';
import { computeTechnicianSlots } from '../../../../../../../lib/technician-available-slots';
import { isTechnicianTenantMetadata } from '../../../../../../../lib/technician-tenant-profile';
import { fetchTenantMetadataBySlug } from '../../../../../../../lib/tenant-metadata';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/local-services/public/tenants/{slug}/available-slots?date=YYYY-MM-DD&service_external_id=pc-cleanup
 * MVP slot grid from ls_technician_schedules (UTC day boundary for bookings query).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;

  const gate = await assertLocalServicesTenantPublic(slug);
  if (gate !== null) {
    return gate;
  }

  const metadata = await fetchTenantMetadataBySlug(slug);
  if (metadata === null || !isTechnicianTenantMetadata(metadata)) {
    return Response.json({ error: 'not_technician_tenant' }, { status: HTTP_STATUS.BAD_REQUEST });
  }

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

  const svc = await lsGetServiceByExternalKey({ tenantSlug: slug, externalKey: serviceExternalId });
  if (svc === null) {
    return Response.json({ error: 'service_not_found' }, { status: HTTP_STATUS.NOT_FOUND });
  }

  const duration = svc.duration_minutes ?? 90;
  const d = new Date(`${date}T12:00:00.000Z`);
  const dayOfWeek = d.getUTCDay();

  const slots = await computeTechnicianSlots({
    tenantSlug: slug,
    dateOnly: date,
    dayOfWeek,
    slotStepMinutes: 30,
    serviceDurationMinutes: duration,
  });

  return Response.json({ date, service_external_id: serviceExternalId, slots });
}
