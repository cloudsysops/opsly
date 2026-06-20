import type { NextRequest } from 'next/server';
import { getServiceClient } from '../../../../../lib/supabase';
import { checkIpRateLimit } from '../../../../../lib/rate-limit-ip';
import { HTTP_STATUS } from '../../../../../lib/constants';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  const rateLimit = await checkIpRateLimit(request, 'ratelimit:governance:dsar-verify');
  if (!rateLimit.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: HTTP_STATUS.TOO_MANY_REQUESTS });
  }

  const { token } = await params;
  if (!token || token.length < 10) {
    return Response.json({ error: 'Invalid token' }, { status: 400 });
  }

  const client = getServiceClient();
  const { data, error } = await client
    .schema('governance')
    .from('dsar_requests')
    .select(
      'id, tenant_id, subject_email, request_type, status, created_at, sla_deadline, fulfilled_at'
    )
    .eq('verification_token', token)
    .single();

  if (error || !data) {
    return Response.json({ error: 'Request not found' }, { status: 404 });
  }

  // Mark as verified if still in received state
  if (data.status === 'received') {
    await client
      .schema('governance')
      .from('dsar_requests')
      .update({ status: 'verified', verified_at: new Date().toISOString() })
      .eq('verification_token', token);
  }

  return Response.json({ ok: true, request: data });
}
