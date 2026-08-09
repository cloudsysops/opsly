import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractIp, logAuditEvent } from '../../../../lib/audit';
import { checkRateLimit } from '../../../../lib/rate-limiter';
import { HTTP_STATUS } from '../../../../lib/constants';
import { getServiceClient } from '../../../../lib/supabase';

const consentSchema = z.object({
  tenant_id: z.string().min(1),
  subject_email: z.string().email().optional(),
  policy_id: z.string().min(1),
  policy_version: z.string().min(1),
  consent_type: z.enum(['treatment', 'marketing', 'parental', 'ai_chat', 'cookie']),
  metadata: z.record(z.unknown()).optional(),
});

type ConsentPayload = z.infer<typeof consentSchema>;

async function insertConsent(
  payload: ConsentPayload,
  ip: string | null,
  userAgent: string | null
): Promise<{ data: { id: string; granted_at: string } | null; error: unknown }> {
  const client = getServiceClient();
  const res = await client
    .schema('governance')
    .from('consents')
    .insert({ ...payload, ip, user_agent: userAgent })
    .select('id, granted_at')
    .single();
  return { data: res.data as { id: string; granted_at: string } | null, error: res.error };
}

export async function POST(request: NextRequest): Promise<Response> {
  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(ip ? `consent:${ip}` : 'consent:anonymous');
  if (!rateLimit.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: HTTP_STATUS.TOO_MANY_REQUESTS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const userAgent = request.headers.get('user-agent') ?? null;
  const { data, error } = await insertConsent(parsed.data, ip, userAgent);
  if (error || !data) {
    console.error('[governance][consent] insert error', error);
    return Response.json({ error: 'Failed to record consent' }, { status: 500 });
  }

  void logAuditEvent({
    tenant_slug: parsed.data.tenant_id,
    action: 'governance_consent_record',
    resource: `consent:${data.id}`,
    ip,
    user_agent: userAgent ?? undefined,
    metadata: {
      subject_email: parsed.data.subject_email,
      policy_id: parsed.data.policy_id,
      policy_version: parsed.data.policy_version,
      consent_type: parsed.data.consent_type,
    },
  });

  return Response.json(
    { ok: true, consent_id: data.id, granted_at: data.granted_at },
    { status: 201 }
  );
}
