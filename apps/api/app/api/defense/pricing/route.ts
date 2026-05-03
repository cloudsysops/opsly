import { DEFENSE_PLANS } from '../../../../lib/defense/pricing';
import { requireAdminAccessUnlessDemoRead } from '../../../../lib/auth';

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminAccessUnlessDemoRead(request);
  if (auth !== null) {
    return auth;
  }

  return Response.json({ plans: DEFENSE_PLANS });
}
