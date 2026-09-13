import type { NextRequest } from 'next/server';
import { handleHealthTravelEventRequest } from '../../../../../lib/health-travel-events';

/**
 * Signed ingress from the independently deployed SmileTripCare runtime.
 *
 * Boundary:
 * - commercial/travel coordination events only
 * - no diagnosis, clinical notes, medical records, photos, prescriptions or lab data
 * - HMAC-SHA256 over the exact raw JSON body
 */
export async function POST(request: NextRequest): Promise<Response> {
  return handleHealthTravelEventRequest(request);
}
