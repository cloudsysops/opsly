import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { parseJsonBody } from '../../../../lib/api-response';
import { extractIp, logAuditEvent } from '../../../../lib/audit';
import { HTTP_STATUS } from '../../../../lib/constants';
import { boundedStringMetadataSchema } from '../../../../lib/peskids/schemas';
import { checkRateLimit } from '../../../../lib/rate-limiter';
import { getServiceClient } from '../../../../lib/supabase';

const TENANT_ID_MIN = 3;
const TENANT_ID_MAX = 64;
const EMAIL_MAX_LEN = 254;
const POLICY_ID_MAX = 120;
const POLICY_VERSION_MAX = 64;
const EMAIL_MIN_LOCAL_LEN = 2;
const MAX_USER_AGENT_LEN = 512;

const consentSchema = z.object({
  tenant_id: z
    .string()
    .trim()
    .min(TENANT_ID_MIN)
    .max(TENANT_ID_MAX)
    .regex(/^[a-zA-Z0-9_-]+$/, 'tenant_id must be alphanumeric'),
  subject_email: z.string().email().max(EMAIL_MAX_LEN).optional(),
  policy_id: z.string().trim().min(1).max(POLICY_ID_MAX),
  policy_version: z.string().trim().min(1).max(POLICY_VERSION_MAX),
  consent_type: z.enum(['treatment', 'marketing', 'parental', 'ai_chat', 'cookie']),
  metadata: boundedStringMetadataSchema.optional(),
});

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return '***@***';
  if (local.length <= EMAIL_MIN_LOCAL_LEN) {
    return `${local[0]}***@${domain}`;
  }
  return `${local[0]}***${local[local.length - 1]}@${domain}`;
}

async function insertConsent(
  data: z.infer<typeof consentSchema>,
  ip: string | null,
  user_agent: string | null
): Promise<{ data: { id: string; granted_at: string } | null; error: unknown }> {
  const client = getServiceClient();
  const res = await client
    .schema('governance')
    .from('consents')
    .insert({
      ...data,
      ip,
      user_agent,
    })
    .select('id, granted_at')
    .single();

  return {
    data: res.data as { id: string; granted_at: string } | null,
    error: res.error,
  };
}

export async function POST(request: NextRequest): Promise<Response> {
  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(ip ? `consent:${ip}` : 'consent:anonymous');
  if (!rateLimit.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: HTTP_STATUS.TOO_MANY_REQUESTS });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) {
    return Response.json({ error: 'Invalid JSON' }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  const parsed = consentSchema.safeParse(parsedBody.body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  const user_agent = request.headers.get('user-agent')?.slice(0, MAX_USER_AGENT_LEN) ?? null;

  const { data, error } = await insertConsent(parsed.data, ip, user_agent);

  if (error || !data) {
    console.error('[governance][consent] insert error', error);
    return Response.json(
      { error: 'Failed to record consent' },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }

  void logAuditEvent({
    tenant_slug: parsed.data.tenant_id,
    action: 'CONSENT_RECORD',
    resource: `consent:${data.id}`,
    ip,
    user_agent: user_agent ?? undefined,
    metadata: {
      policy_id: parsed.data.policy_id,
      policy_version: parsed.data.policy_version,
      consent_type: parsed.data.consent_type,
      subject_email: parsed.data.subject_email ? maskEmail(parsed.data.subject_email) : undefined,
    },
  });

  return Response.json(
    { ok: true, consent_id: data.id, granted_at: data.granted_at },
    { status: HTTP_STATUS.CREATED }
  );
}
