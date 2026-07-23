import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractIp, logAuditEvent } from '../../../../lib/audit';
import { getServiceClient } from '../../../../lib/supabase';
import { checkRateLimit } from '../../../../lib/rate-limiter';
import { HTTP_STATUS } from '../../../../lib/constants';

const consentSchema = z.object({
  tenant_id: z.string().min(1),
  subject_email: z.string().email().optional(),
  policy_id: z.string().min(1),
  policy_version: z.string().min(1),
  consent_type: z.enum(['treatment', 'marketing', 'parental', 'ai_chat', 'cookie']),
  metadata: z.record(z.unknown()).optional(),
});

type ConsentType = z.infer<typeof consentSchema>;

function triggerAuditLog(
  dataId: string,
  parsedData: ConsentType,
  ip: string | null,
  userAgent: string | null
): void {
  void logAuditEvent({
    tenant_slug: parsedData.tenant_id,
    action: 'governance_consent_record',
    resource: `consent:${dataId}`,
    ip,
    user_agent: userAgent ?? undefined,
    metadata: {
      consent_type: parsedData.consent_type,
      policy_id: parsedData.policy_id,
      policy_version: parsedData.policy_version,
      subject_email: parsedData.subject_email,
    },
  });
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
    return Response.json({ error: 'Invalid JSON' }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  const user_agent = request.headers.get('user-agent') ?? null;
  const client = getServiceClient();
  const { data, error } = await client
    .schema('governance')
    .from('consents')
    .insert({ ...parsed.data, ip, user_agent })
    .select('id, granted_at')
    .single();

  if (error) {
    console.error('[governance][consent] insert error', error);
    return Response.json(
      { error: 'Failed to record consent' },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }

  triggerAuditLog(data.id, parsed.data, ip, user_agent);

  return Response.json(
    { ok: true, consent_id: data.id, granted_at: data.granted_at },
    { status: HTTP_STATUS.CREATED }
  );
}
