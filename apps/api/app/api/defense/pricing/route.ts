import { DEFENSE_PLANS } from '../../../../lib/defense/pricing';
import { requireAdminAccessUnlessDemoRead } from '../../../../lib/auth';
import { extractIp } from '../../../../lib/audit';
import { checkRateLimit } from '../../../../lib/rate-limiter';
import { jsonError } from '../../../../lib/api-response';
import { HTTP_STATUS } from '../../../../lib/constants';

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminAccessUnlessDemoRead(request);
  if (auth !== null) {
    return auth;
  }

  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(ip ? `defense-pricing:${ip}` : 'defense-pricing:anon');
  if (!rateLimit.allowed) {
    return jsonError('Too many requests', HTTP_STATUS.TOO_MANY_REQUESTS);
  }

  return Response.json({ plans: DEFENSE_PLANS });
}
