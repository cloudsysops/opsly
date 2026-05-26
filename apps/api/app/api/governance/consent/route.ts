import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { getServiceClient } from '../../../../lib/supabase';

const consentSchema = z.object({
  tenant_id: z.string().min(1),
  subject_email: z.string().email().optional(),
  policy_id: z.string().min(1),
  policy_version: z.string().min(1),
  consent_type: z.enum(['treatment', 'marketing', 'parental', 'ai_chat', 'cookie']),
  metadata: z.record(z.unknown()).optional(),
});

export async function POST(request: NextRequest): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = consentSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? request.headers.get('x-real-ip')
    ?? null;
  const user_agent = request.headers.get('user-agent') ?? null;

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
    return Response.json({ error: 'Failed to record consent' }, { status: 500 });
  }

  return Response.json({ ok: true, consent_id: data.id, granted_at: data.granted_at }, { status: 201 });
}
