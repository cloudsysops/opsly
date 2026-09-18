import type { NextRequest } from 'next/server';
import { handleHealthTravelEventRequest } from '../../../../../lib/health-travel-events';

export async function POST(request: NextRequest): Promise<Response> {
  return handleHealthTravelEventRequest(request);
}
