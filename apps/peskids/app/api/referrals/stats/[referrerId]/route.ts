import { NextRequest } from 'next/server';
import { referralService } from '@/lib/referrals/referral.service';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffSession } from '@/lib/staff-auth';

export async function GET(req: NextRequest, context: { params: Promise<{ referrerId: string }> }) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  try {
    const { referrerId } = await context.params;
    const stats = await referralService.getReferralStats(referrerId);
    return successJson(requestId, { ...stats });
  } catch (error) {
    return errorJson(requestId, error instanceof Error ? error.message : 'Failed to load stats', 500);
  }
}
