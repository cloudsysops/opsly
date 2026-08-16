import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { extractIp, logAuditEvent } from '../../../../lib/audit';
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

type BreachInput = z.infer<typeof breachSchema>;

function getActorId(ip: string | null): string {
  return ip ? `anonymous:${ip}` : 'anonymous';
}

function verifyAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const expectedToken = process.env.GOVERNANCE_BREACH_SECRET;
  return Boolean(expectedToken && authHeader === `Bearer ${expectedToken}`);
}

async function insertBreachLog(parsedData: BreachInput, ip: string | null): Promise<Response> {
  const client = getServiceClient();
  const { data, error } = await client
    .schema('governance')
    .from('breach_log')
    .insert(parsedData)
    .select('id, created_at')
    .single();

  if (error) {
    console.error('[governance][breach] insert error', error);
    await logAuditEvent({
      action: 'governance_breach_report_failed',
      resource: 'governance:breach',
      tenant_slug: parsedData.tenant_id,
      ip,
      metadata: { actor_id: getActorId(ip), reason: 'db_insert_error', title: parsedData.title },
    });
    return Response.json({ error: 'Failed to log breach' }, { status: 500 });
  }

  await logAuditEvent({
    action: 'governance_breach_report',
    resource: `governance:breach:${data.id}`,
    tenant_slug: parsedData.tenant_id,
    ip,
    metadata: {
      actor_id: getActorId(ip),
      breach_id: data.id,
      severity: parsedData.severity,
      title: parsedData.title,
    },
  });

  return Response.json(
    { ok: true, breach_id: data.id, logged_at: data.created_at },
    { status: 201 }
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  const ip = extractIp(request);
  const rateLimitKey = ip ? `governance-breach:${ip}` : 'governance-breach:anonymous';
  const rateLimit = await checkRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    await logAuditEvent({
      action: 'governance_breach_report_failed',
      resource: 'governance:breach',
      ip,
      metadata: { actor_id: getActorId(ip), reason: 'rate_limited' },
    });
    return Response.json({ error: 'Too many requests' }, { status: 429 });
  }

  if (!verifyAuth(request)) {
    await logAuditEvent({
      action: 'governance_breach_report_failed',
      resource: 'governance:breach',
      ip,
      metadata: { actor_id: getActorId(ip), reason: 'unauthorized' },
    });
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    await logAuditEvent({
      action: 'governance_breach_report_failed',
      resource: 'governance:breach',
      ip,
      metadata: { actor_id: getActorId(ip), reason: 'invalid_json' },
    });
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = breachSchema.safeParse(body);
  if (!parsed.success) {
    await logAuditEvent({
      action: 'governance_breach_report_failed',
      resource: 'governance:breach',
      ip,
      metadata: { actor_id: getActorId(ip), reason: 'validation_error' },
    });
    return Response.json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  return insertBreachLog(parsed.data, ip);
}
