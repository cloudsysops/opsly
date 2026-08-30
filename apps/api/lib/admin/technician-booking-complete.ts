import type { NextRequest } from 'next/server';
import { jsonError, parseJsonBody, serverErrorLogged } from '../api-response';
import { requireAdminAccess } from '../auth';
import { HTTP_STATUS } from '../constants';
import { technicianBookingCompleteBodySchema } from '../admin-local-services-complete-schema';
import { coalesceNull } from '../nullish';
import {
  lsGetBookingByIdForTenantSlug,
  lsInsertTechnicianServiceReport,
  lsSetBookingStatusForTenantSlug,
  type LsTechnicianServiceReportInput,
} from '../repositories/local-services-repository';
import { TenantRefParamSchema, formatZodError } from '../validation';
import type { z } from 'zod';

type CompleteBody = z.infer<typeof technicianBookingCompleteBodySchema>;

function completeBodyToReportInput(
  tenantSlug: string,
  bookingId: string,
  body: CompleteBody
): LsTechnicianServiceReportInput {
  return {
    bookingId,
    tenantSlug,
    findings: coalesceNull(body.findings),
    actionsTaken: coalesceNull(body.actions_taken),
    metricsBefore: coalesceNull(body.metrics_before),
    metricsAfter: coalesceNull(body.metrics_after),
    recommendations: coalesceNull(body.recommendations),
    equipmentUsed: coalesceNull(body.equipment_used),
    timeSpentMinutes: coalesceNull(body.time_spent_minutes),
    travelDistanceMiles: coalesceNull(body.travel_distance_miles),
    customerSatisfaction: coalesceNull(body.customer_satisfaction),
    upsellOffered: coalesceNull(body.upsell_offered),
    nextMaintenanceDate: coalesceNull(body.next_maintenance_date),
    pdfUrl: coalesceNull(body.pdf_url),
  };
}

async function parseSlugBookingIdAndBody(
  request: NextRequest,
  slug: string,
  bookingId: string
): Promise<
  | { ok: false; response: Response }
  | { ok: true; tenantSlug: string; bookingId: string; body: CompleteBody }
> {
  const slugParsed = TenantRefParamSchema.safeParse(slug);
  if (!slugParsed.success) {
    return {
      ok: false,
      response: jsonError(formatZodError(slugParsed.error), HTTP_STATUS.BAD_REQUEST),
    };
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) {
    return { ok: false, response: parsedBody.response };
  }

  const parsed = technicianBookingCompleteBodySchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return {
      ok: false,
      response: jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST),
    };
  }

  return { ok: true, tenantSlug: slugParsed.data, bookingId, body: parsed.data };
}

/**
 * POST admin complete technician booking: reporte + estado completed.
 */
export async function postTechnicianBookingComplete(
  request: NextRequest,
  routeParams: { slug: string; bookingId: string }
): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError !== null) {
    return authError;
  }

  const parsed = await parseSlugBookingIdAndBody(request, routeParams.slug, routeParams.bookingId);
  if (!parsed.ok) {
    return parsed.response;
  }

  const { tenantSlug, bookingId, body } = parsed;
  const booking = await lsGetBookingByIdForTenantSlug({ tenantSlug, bookingId });
  if (booking === null) {
    return jsonError('Booking not found', HTTP_STATUS.NOT_FOUND);
  }

  const rep = await lsInsertTechnicianServiceReport(
    completeBodyToReportInput(tenantSlug, bookingId, body)
  );

  if (!rep.ok) {
    return jsonError('Failed to create service report', HTTP_STATUS.INTERNAL_ERROR);
  }

  const done = await lsSetBookingStatusForTenantSlug({
    tenantSlug,
    bookingId,
    status: 'completed',
  });
  if (!done.ok) {
    return serverErrorLogged('complete booking status', new Error('status_update_failed'));
  }

  return Response.json({ ok: true, report_id: rep.id, booking_id: bookingId });
}
