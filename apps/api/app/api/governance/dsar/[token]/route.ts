import type { NextRequest } from 'next/server';
import { checkRateLimit } from '../../../../../lib/rate-limiter';
import { getServiceClient } from '../../../../../lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  const { token } = await params;
  if (!token || token.length < 10) {
    return Response.json({ error: 'Invalid token' }, { status: 400 });
  }

  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'unknown';

  const ratelimit = await checkRateLimit(`governance:dsar-verify:${ip}`);
  if (!ratelimit.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: 429 });
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
