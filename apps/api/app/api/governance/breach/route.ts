import { timingSafeEqual } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractIp, logAuditEvent } from '../../../../lib/audit';
import { HTTP_STATUS } from '../../../../lib/constants';
import { checkRateLimit } from '../../../../lib/rate-limiter';
import { getServiceClient } from '../../../../lib/supabase';

const breachSchema = z.object({
  tenant_id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  discovered_at: z.string().datetime(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  affected_data_types: z.array(z.string()).default([]),
  affected_subject_count: z.number().int().positive().optional(),
  root_cause: z.string().optional(),
  containment_actions: z.string().optional(),
});

function isAuthorizedToken(authHeader: string | null, expectedToken: string | undefined): boolean {
  if (!authHeader || !expectedToken) return false;
  const expectedHeader = `Bearer ${expectedToken}`;
  const bufActual = Buffer.from(authHeader);
  const bufExpected = Buffer.from(expectedHeader);
  if (bufActual.length !== bufExpected.length) return false;
  return timingSafeEqual(bufActual, bufExpected);
}

export async function POST(request: NextRequest): Promise<Response> {
  const ip = extractIp(request);
  const rateLimitKey = ip ? `governance-breach:${ip}` : 'governance-breach:anonymous';
  const rateLimit = await checkRateLimit(rateLimitKey);

  if (!rateLimit.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: HTTP_STATUS.TOO_MANY_REQUESTS });
  }

  const authHeader = request.headers.get('authorization');
  if (!isAuthorizedToken(authHeader, process.env.GOVERNANCE_BREACH_SECRET)) {
    return Response.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  const parsed = breachSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }

  const { data, error } = await getServiceClient()
    .schema('governance')
    .from('breach_log')
    .insert(parsed.data)
    .select('id, created_at')
    .single();

  if (error) {
    console.error('[governance][breach] insert error', error);
    return Response.json({ error: 'Failed to log breach' }, { status: HTTP_STATUS.INTERNAL_ERROR });
  }

  void logAuditEvent({
    tenant_slug: parsed.data.tenant_id,
    action: 'BREACH_LOGGED',
    resource: `governance_breach:${data.id}`,
    ip,
    user_agent: request.headers.get('user-agent') ?? undefined,
    metadata: { severity: parsed.data.severity, title: parsed.data.title },
  });

  return Response.json(
    { ok: true, breach_id: data.id, logged_at: data.created_at },
    { status: HTTP_STATUS.CREATED }
  );
}
