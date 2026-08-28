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

type BreachPayload = z.infer<typeof breachSchema>;

function timingSafeCompare(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

function checkBreachAuth(request: NextRequest): Response | null {
  const authHeader = request.headers.get('authorization') ?? '';
  const expectedToken = process.env.GOVERNANCE_BREACH_SECRET;
  const expectedHeader = expectedToken ? `Bearer ${expectedToken}` : '';

  if (!expectedToken || !authHeader || !timingSafeCompare(authHeader, expectedHeader)) {
    return Response.json({ error: 'Unauthorized' }, { status: HTTP_STATUS.UNAUTHORIZED });
  }
  return null;
}

async function parseBreachBody(
  request: NextRequest
): Promise<{ ok: true; data: BreachPayload } | { ok: false; response: Response }> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return {
      ok: false,
      response: Response.json({ error: 'Invalid JSON' }, { status: HTTP_STATUS.BAD_REQUEST }),
    };
  }

  const parsed = breachSchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Invalid payload', details: parsed.error.flatten() },
        { status: HTTP_STATUS.BAD_REQUEST }
      ),
    };
  }
  return { ok: true, data: parsed.data };
}

export async function POST(request: NextRequest): Promise<Response> {
  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(
    ip ? `governance-breach:${ip}` : 'governance-breach:anonymous'
  );
  if (!rateLimit.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: HTTP_STATUS.TOO_MANY_REQUESTS });
  }

  const authError = checkBreachAuth(request);
  if (authError) {
    return authError;
  }

  const parsed = await parseBreachBody(request);
  if (!parsed.ok) {
    return parsed.response;
  }

  const client = getServiceClient();
  const { data, error } = await client
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
    actor_email: ip ? `ip:${ip}` : 'governance-service',
    action: 'governance_breach_log_created',
    resource: `breach_log:${data.id}`,
    metadata: {
      title: parsed.data.title,
      severity: parsed.data.severity,
      discovered_at: parsed.data.discovered_at,
    },
  });

  return Response.json(
    { ok: true, breach_id: data.id, logged_at: data.created_at },
    { status: HTTP_STATUS.CREATED }
  );
}
