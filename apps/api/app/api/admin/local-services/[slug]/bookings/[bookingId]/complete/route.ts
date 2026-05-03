import type { NextRequest } from 'next/server';
import { tryRoute } from '../../../../../../../../lib/api-response';
import { postTechnicianBookingComplete } from '../../../../../../../../lib/admin/technician-booking-complete';

/**
 * POST /api/admin/local-services/{slug}/bookings/{bookingId}/complete
 * Creates ls_technician_service_report and marks booking completed (Twilio/n8n/PDF left to workflows).
 */
export function POST(
  request: NextRequest,
  context: { params: Promise<{ slug: string; bookingId: string }> }
): Promise<Response> {
  return tryRoute('POST /api/admin/local-services/.../complete', async () => {
    const { slug, bookingId } = await context.params;
    return postTechnicianBookingComplete(request, { slug, bookingId });
  });
}
