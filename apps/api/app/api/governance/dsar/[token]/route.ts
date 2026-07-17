import type { NextRequest } from 'next/server';
import { extractIp, logAuditEvent } from '../../../../../lib/audit';
import { HTTP_STATUS } from '../../../../../lib/constants';
import { checkRateLimit } from '../../../../../lib/rate-limiter';
import { getServiceClient } from '../../../../../lib/supabase';

// eslint-disable-next-line no-magic-numbers
const MIN_TOKEN_LENGTH = 10;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(ip ? `dsar-verify:${ip}` : 'dsar-verify:anonymous');

  if (!rateLimit.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: HTTP_STATUS.TOO_MANY_REQUESTS });
  }

  const { token } = await params;
  if (!token || token.length < MIN_TOKEN_LENGTH) {
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
    const verified_at = new Date().toISOString();
    await client
      .schema('governance')
      .from('dsar_requests')
      .update({ status: 'verified', verified_at })
      .eq('verification_token', token);

    void logAuditEvent({
      tenant_slug: data.tenant_id,
      action: 'VERIFY',
      resource: `dsar:${data.id}`,
      ip,
      user_agent: request.headers.get('user-agent') ?? undefined,
      metadata: {
        subject_email: data.subject_email,
        request_type: data.request_type,
        verified_at,
      },
    });
  }

  return Response.json({ ok: true, request: data });
}
