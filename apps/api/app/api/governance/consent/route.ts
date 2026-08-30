import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { parseJsonBody } from '../../../../lib/api-response';
import { extractIp } from '../../../../lib/audit';
import { HTTP_STATUS } from '../../../../lib/constants';
import { boundedStringMetadataSchema } from '../../../../lib/peskids/schemas';
import { checkRateLimit } from '../../../../lib/rate-limiter';
import { getServiceClient } from '../../../../lib/supabase';

const consentSchema = z.object({
  tenant_id: z
    .string()
    .trim()
    .min(3)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, 'tenant_id must be alphanumeric'),
  subject_email: z.string().email().max(254).optional(),
  policy_id: z.string().trim().min(1).max(120),
  policy_version: z.string().trim().min(1).max(64),
  consent_type: z.enum(['treatment', 'marketing', 'parental', 'ai_chat', 'cookie']),
  metadata: boundedStringMetadataSchema.optional(),
});

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

  const user_agent = request.headers.get('user-agent')?.slice(0, 512) ?? null;

  const client = getServiceClient();
  const { data, error } = await client
    .schema('governance')
    .from('consents')
    .insert({
      ...parsed.data,
      ip,
      user_agent,
    })
    .select('id, granted_at')
    .single();

  if (error) {
    console.error('[governance][consent] insert error', error);
    return Response.json(
      { error: 'Failed to record consent' },
      { status: HTTP_STATUS.INTERNAL_ERROR }
    );
  }

  return Response.json(
    { ok: true, consent_id: data.id, granted_at: data.granted_at },
    { status: HTTP_STATUS.CREATED }
  );
}
