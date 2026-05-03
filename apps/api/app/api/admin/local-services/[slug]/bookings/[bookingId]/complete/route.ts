import type { NextRequest } from 'next/server';
import {
  jsonError,
  parseJsonBody,
  serverErrorLogged,
  tryRoute,
} from '../../../../../../../../lib/api-response';
import { requireAdminAccess } from '../../../../../../../../lib/auth';
import { HTTP_STATUS } from '../../../../../../../../lib/constants';
import { technicianBookingCompleteBodySchema } from '../../../../../../../../lib/admin-local-services-complete-schema';
import {
  lsGetBookingByIdForTenantSlug,
  lsInsertTechnicianServiceReport,
  lsSetBookingStatusForTenantSlug,
} from '../../../../../../../../lib/repositories/local-services-repository';
import { TenantRefParamSchema, formatZodError } from '../../../../../../../../lib/validation';

/**
 * POST /api/admin/local-services/{slug}/bookings/{bookingId}/complete
 * Creates ls_technician_service_report and marks booking completed (Twilio/n8n/PDF left to workflows).
 */
export function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string; bookingId: string }> }
): Promise<Response> {
  return tryRoute('POST /api/admin/local-services/.../complete', async () => {
    const authError = await requireAdminAccess(request);
    if (authError) {
      return authError;
    }

    const { slug, bookingId } = await context.params;
    const slugParsed = TenantRefParamSchema.safeParse(slug);
    if (!slugParsed.success) {
      return jsonError(formatZodError(slugParsed.error), HTTP_STATUS.BAD_REQUEST);
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) {
      return parsedBody.response;
    }

    const parsed = technicianBookingCompleteBodySchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return jsonError(formatZodError(parsed.error), HTTP_STATUS.BAD_REQUEST);
    }

    const booking = await lsGetBookingByIdForTenantSlug({
      tenantSlug: slugParsed.data,
      bookingId,
    });
    if (booking === null) {
      return jsonError('Booking not found', HTTP_STATUS.NOT_FOUND);
    }

    const rep = await lsInsertTechnicianServiceReport({
      bookingId,
      tenantSlug: slugParsed.data,
      findings: parsed.data.findings ?? null,
      actionsTaken: parsed.data.actions_taken ?? null,
      metricsBefore: parsed.data.metrics_before ?? null,
      metricsAfter: parsed.data.metrics_after ?? null,
      recommendations: parsed.data.recommendations ?? null,
      equipmentUsed: parsed.data.equipment_used ?? null,
      timeSpentMinutes: parsed.data.time_spent_minutes ?? null,
      travelDistanceMiles: parsed.data.travel_distance_miles ?? null,
      customerSatisfaction: parsed.data.customer_satisfaction ?? null,
      upsellOffered: parsed.data.upsell_offered ?? null,
      nextMaintenanceDate: parsed.data.next_maintenance_date ?? null,
      pdfUrl: parsed.data.pdf_url ?? null,
    });

    if (!rep.ok) {
      return jsonError('Failed to create service report', HTTP_STATUS.INTERNAL_ERROR);
    }

    const done = await lsSetBookingStatusForTenantSlug({
      tenantSlug: slugParsed.data,
      bookingId,
      status: 'completed',
    });
    if (!done.ok) {
      return serverErrorLogged('complete booking status', new Error('status_update_failed'));
    }

    return Response.json({ ok: true, report_id: rep.id, booking_id: bookingId });
  });
}
