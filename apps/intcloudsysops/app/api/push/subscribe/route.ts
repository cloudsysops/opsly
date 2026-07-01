import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { validateFamilyRequest } from '@/lib/family-auth';
import { supabaseServer } from '@/lib/supabase';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

const subscribeBodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  userAgent: z.string().optional(),
});

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = resolveRequestId(req);

  const auth = await validateFamilyRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  let body: z.infer<typeof subscribeBodySchema>;
  try {
    const raw: unknown = await req.json();
    body = subscribeBodySchema.parse(raw);
  } catch {
    return errorJson(requestId, 'Invalid request body', 400);
  }

  try {
    const client = supabaseServer();
    const { error } = await client
      .schema('peskids')
      .from('push_subscriptions')
      .upsert(
        {
          user_id: auth.user.id,
          tenant_slug: 'peskids',
          endpoint: body.endpoint,
          p256dh: body.keys.p256dh,
          auth: body.keys.auth,
          user_agent: body.userAgent ?? null,
        },
        { onConflict: 'user_id,endpoint' }
      );

    if (error) {
      console.error('[push/subscribe] upsert error', error);
      return errorJson(requestId, 'Failed to save subscription', 500);
    }

    return successJson(requestId, { subscribed: true }, 201);
  } catch (err) {
    console.error('[push/subscribe] POST exception', err);
    return errorJson(requestId, 'Internal server error', 500);
  }
}

export async function DELETE(req: NextRequest): Promise<Response> {
  const requestId = resolveRequestId(req);

  const auth = await validateFamilyRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  let endpoint: string;
  try {
    const raw: unknown = await req.json();
    const parsed = z.object({ endpoint: z.string().url() }).parse(raw);
    endpoint = parsed.endpoint;
  } catch {
    return errorJson(requestId, 'Invalid request body', 400);
  }

  try {
    const client = supabaseServer();
    const { error } = await client
      .schema('peskids')
      .from('push_subscriptions')
      .delete()
      .eq('user_id', auth.user.id)
      .eq('endpoint', endpoint);

    if (error) {
      console.error('[push/subscribe] delete error', error);
      return errorJson(requestId, 'Failed to remove subscription', 500);
    }

    return successJson(requestId, { unsubscribed: true });
  } catch (err) {
    console.error('[push/subscribe] DELETE exception', err);
    return errorJson(requestId, 'Internal server error', 500);
  }
}
