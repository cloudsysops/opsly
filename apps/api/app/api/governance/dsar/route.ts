import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractIp, logAuditEvent } from '../../../../lib/audit';
import { HTTP_STATUS } from '@intcloudsysops/constants';
import { checkRateLimit } from '../../../../lib/rate-limiter';
import { getServiceClient } from '../../../../lib/supabase';

const dsarSchema = z.object({
  tenant_id: z.string().min(1),
  subject_email: z.string().email(),
  request_type: z.enum(['access', 'rectify', 'delete', 'object', 'portability']),
});

// SLA in business days per jurisdiction: 15 (Ley 1581/Colombia), 45 calendar (CCPA/USA)
const SLA_DAYS: Record<string, number> = {
  peskids: 15,
  default: 30,
};

function addBusinessDays(date: Date, days: number): Date {
  const result = new Date(date);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function POST(request: NextRequest): Promise<Response> {
  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(ip ? `dsar:${ip}` : 'dsar:anonymous');

  if (!rateLimit.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: HTTP_STATUS.TOO_MANY_REQUESTS });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = dsarSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { tenant_id, subject_email, request_type } = parsed.data;
  const slaDays = SLA_DAYS[tenant_id] ?? SLA_DAYS.default;
  const sla_deadline = addBusinessDays(new Date(), slaDays).toISOString();
  const verification_token = generateToken();

  const client = getServiceClient();
  const { data, error } = await client
    .schema('governance')
    .from('dsar_requests')
    .insert({
      tenant_id,
      subject_email,
      request_type,
      sla_deadline,
      verification_token,
    })
    .select('id, created_at, sla_deadline')
    .single();

  if (error) {
    console.error('[governance][dsar] insert error', error);
    return Response.json({ error: 'Failed to create DSAR request' }, { status: 500 });
  }

  // TODO: send verification email via Resend with token link
  // await sendDsarVerificationEmail({ subject_email, token: verification_token, tenant_id });

  void logAuditEvent({
    tenant_slug: tenant_id,
    action: 'CREATE',
    resource: `dsar:${data.id}`,
    ip,
    user_agent: request.headers.get('user-agent') ?? undefined,
    metadata: {
      subject_email,
      request_type,
      sla_deadline: data.sla_deadline,
    },
  });

  return Response.json(
    {
      ok: true,
      request_id: data.id,
      created_at: data.created_at,
      sla_deadline: data.sla_deadline,
      message: 'Request received. Check your email for a verification link.',
    },
    { status: 201 }
  );
}
