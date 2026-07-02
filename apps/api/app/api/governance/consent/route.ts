import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractIp, logAuditEvent } from '../../../../lib/audit';
import { HTTP_STATUS } from '../../../../lib/constants';
import { checkRateLimit } from '../../../../lib/rate-limiter';
import { getServiceClient } from '../../../../lib/supabase';

const consentSchema = z.object({
  tenant_id: z.string().min(1),
  subject_email: z.string().email().optional(),
  policy_id: z.string().min(1),
  policy_version: z.string().min(1),
  consent_type: z.enum(['treatment', 'marketing', 'parental', 'ai_chat', 'cookie']),
  metadata: z.record(z.unknown()).optional(),
});

async function getJsonBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(ip ? `governance:consent:${ip}` : 'governance:consent:anonymous');

  if (!rateLimit.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: HTTP_STATUS.TOO_MANY_REQUESTS });
  }

  const body = await getJsonBody(request);
  if (!body) return Response.json({ error: 'Invalid JSON' }, { status: 400 });

  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const client = getServiceClient();
  const { data, error } = await client
    .schema('governance')
    .from('consents')
    .insert({ ...parsed.data, ip, user_agent: request.headers.get('user-agent') })
    .select('id, granted_at')
    .single();

  if (error) {
    console.error('[governance][consent] insert error', error);
    return Response.json({ error: 'Failed to record consent' }, { status: 500 });
  }

  void logAuditEvent({
    tenant_slug: parsed.data.tenant_id,
    action: 'CREATE',
    resource: `consent:${data.id}`,
    ip,
    user_agent: request.headers.get('user-agent') ?? undefined,
    metadata: { policy_id: parsed.data.policy_id, consent_type: parsed.data.consent_type },
  });

  return Response.json({ ok: true, consent_id: data.id, granted_at: data.granted_at }, { status: 201 });
}
