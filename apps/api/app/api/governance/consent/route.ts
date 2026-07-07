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

type ConsentData = z.infer<typeof consentSchema>;

async function validateBody(
  request: NextRequest
): Promise<{ data?: ConsentData; error?: Response }> {
  try {
    const body = await request.json();
    const parsed = consentSchema.safeParse(body);
    if (!parsed.success) {
      return {
        error: Response.json(
          { error: 'Invalid payload', details: parsed.error.flatten() },
          { status: 400 }
        ),
      };
    }
    return { data: parsed.data };
  } catch {
    return { error: Response.json({ error: 'Invalid JSON' }, { status: 400 }) };
  }
}

export async function POST(request: NextRequest): Promise<Response> {
  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(ip ? `consent:${ip}` : 'consent:anonymous');

  if (!rateLimit.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: HTTP_STATUS.TOO_MANY_REQUESTS });
  }

  const { data, error } = await validateBody(request);
  if (error || !data) return error || Response.json({ error: 'Internal Error' }, { status: 500 });

  const user_agent = request.headers.get('user-agent') ?? null;
  const client = getServiceClient();
  const { data: row, error: dbError } = await client
    .schema('governance')
    .from('consents')
    .insert({ ...data, ip, user_agent })
    .select('id, granted_at')
    .single();

  if (dbError) {
    console.error('[governance][consent] insert error', dbError);
    return Response.json({ error: 'Failed to record consent' }, { status: 500 });
  }

  void logAuditEvent({
    tenant_slug: data.tenant_id,
    action: 'create_consent',
    resource: `consent:${row.id}`,
    ip,
    user_agent: user_agent ?? undefined,
    metadata: {
      subject_email: data.subject_email,
      policy_id: data.policy_id,
      consent_type: data.consent_type,
    },
  });

  return Response.json(
    { ok: true, consent_id: row.id, granted_at: row.granted_at },
    { status: 201 }
  );
}
