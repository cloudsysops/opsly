import { DEFENSE_PLANS } from '../../../../lib/defense/pricing';
import { requireAdminAccessUnlessDemoRead } from '../../../../lib/auth';

// Bolt Optimization: Pre-serialize static defense pricing plans JSON and use private browser cache control
// to avoid re-serializing JSON while preventing CDN authorization bypass (1 hour private browser TTL, 1 day SWR).
const PRICING_RESPONSE_BODY = JSON.stringify({ plans: DEFENSE_PLANS });
const PRICING_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400',
};

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminAccessUnlessDemoRead(request);
  if (auth !== null) {
    return auth;
  }

  return new Response(PRICING_RESPONSE_BODY, {
    status: 200,
    headers: PRICING_HEADERS,
  });
}
