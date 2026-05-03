import type { NextRequest } from 'next/server';
import { postPublicLocalServicesBooking } from '../../../../../../../lib/local-services/public-booking-post';

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
  return postPublicLocalServicesBooking(request, slug);
}
