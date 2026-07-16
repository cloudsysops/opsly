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

export async function POST(request: NextRequest): Promise<Response> {
  const ip = extractIp(request);
  const rateLimit = await checkRateLimit(
    ip ? `governance-breach:${ip}` : 'governance-breach:anonymous'
  );
  if (!rateLimit.allowed) {
    return Response.json({ error: 'Too many requests' }, { status: HTTP_STATUS.TOO_MANY_REQUESTS });
  }

  // Internal-only endpoint: requires service-role secret header
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.GOVERNANCE_BREACH_SECRET;
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = breachSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    );
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
    return Response.json({ error: 'Failed to log breach' }, { status: 500 });
  }

  void logAuditEvent({
    tenant_slug: parsed.data.tenant_id,
    action: 'governance_breach_report',
    resource: `breach:${data.id}`,
    ip,
    user_agent: request.headers.get('user-agent') ?? undefined,
    metadata: { title: parsed.data.title, severity: parsed.data.severity },
  });

  return Response.json(
    { ok: true, breach_id: data.id, logged_at: data.created_at },
    { status: 201 }
  );
}
