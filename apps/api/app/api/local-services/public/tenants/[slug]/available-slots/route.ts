import type { NextRequest } from 'next/server';
import { getPublicAvailableSlots } from '../../../../../../../lib/local-services/public-available-slots-get';

/**
 * GET /api/local-services/public/tenants/{slug}/available-slots?date=YYYY-MM-DD&service_external_id=pc-cleanup
 * MVP slot grid from ls_technician_schedules (UTC day boundary for bookings query).
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> }
): Promise<Response> {
  const { slug } = await context.params;
  return getPublicAvailableSlots(request, slug);
}
