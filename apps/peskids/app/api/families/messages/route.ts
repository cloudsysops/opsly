import { type NextRequest } from 'next/server';
import { validateFamilyRequest } from '@/lib/family-auth';
import { supabaseServer } from '@/lib/supabase';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import type { Database } from '@/lib/types';
import { pgFilterValue } from '@/lib/utils/postgrest-filter';

type MessageRow = Database['public']['Tables']['messages']['Row'];

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateFamilyRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const tenantId = (process.env.NEXT_PUBLIC_TENANT_ID ?? 'peskids').trim();
  const parentEmail = auth.user.email?.trim().toLowerCase() ?? '';

  if (!parentEmail) {
    return errorJson(requestId, 'Family email not found in session', 400);
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10), 1), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0);

  const supabase = supabaseServer();

  // Fetch messages where the parent is the sender (inbound from family) OR
  // where the message is addressed outbound to this parent's contact
  const { data, error, count } = await supabase
    .from('messages')
    .select('*', { count: 'exact' })
    .eq('tenant_id', tenantId)
    .or(
      `sender_contact.ilike.${pgFilterValue(parentEmail)},sender_contact.ilike.${pgFilterValue(`web:${parentEmail}`)}`
    )
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('[families/messages GET]', error);
    return errorJson(requestId, 'Failed to fetch messages', 500);
  }

  const messages = (data ?? []) as MessageRow[];

  return successJson(requestId, { messages, total: count ?? messages.length });
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateFamilyRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const tenantId = (process.env.NEXT_PUBLIC_TENANT_ID ?? 'peskids').trim();
  const parentEmail = auth.user.email?.trim().toLowerCase() ?? '';
  const parentName =
    (auth.user.user_metadata?.full_name as string | undefined) ??
    (auth.user.user_metadata?.name as string | undefined) ??
    parentEmail;

  if (!parentEmail) {
    return errorJson(requestId, 'Family email not found in session', 400);
  }

  let body: { text?: unknown; subject?: unknown };
  try {
    body = (await req.json()) as { text?: unknown; subject?: unknown };
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text || text.length > 2000) {
    return errorJson(requestId, 'message text is required and must be under 2000 characters', 400);
  }

  const supabase = supabaseServer();

  const { data: inserted, error: insertError } = await supabase
    .from('messages')
    .insert({
      tenant_id: tenantId,
      source: 'web',
      sender_contact: parentEmail,
      sender_name: parentName,
      message_text: text,
      direction: 'inbound',
      status: 'pending',
      ai_generated: false,
    })
    .select()
    .single();

  if (insertError) {
    console.error('[families/messages POST]', insertError);
    return errorJson(requestId, 'Failed to send message', 500);
  }

  // Fire n8n notification (best-effort, non-blocking)
  const n8nBase = process.env.N8N_WEBHOOK_BASE_URL?.trim();
  if (n8nBase) {
    const notifyUrl = `${n8nBase}/peskids-notify`;
    void fetch(notifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'parent_message',
        tenant_id: tenantId,
        message_id: (inserted as MessageRow).id,
        sender_email: parentEmail,
        sender_name: parentName,
        text,
        created_at: (inserted as MessageRow).created_at,
      }),
    }).catch((err: unknown) => {
      console.warn('[families/messages POST] n8n notify failed', err);
    });
  }

  return successJson(requestId, { message: inserted as MessageRow }, 201);
}
