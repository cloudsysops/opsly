import { type NextRequest } from 'next/server';
import { validateFamilyRequest } from '@/lib/family-auth';
import { supabaseServer } from '@/lib/supabase';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import {
  FAMILY_MESSAGE_COLUMNS,
  isPostgrestFilterSafe,
  toFamilyMessageView,
} from '@/lib/privacy/pii-projections';

type MessageRowLike = {
  id: string;
  source: string;
  sender_name: string | null;
  message_text: string;
  direction: string;
  status: string | null;
  created_at: string;
};

const SELECT_COLUMNS = FAMILY_MESSAGE_COLUMNS.join(', ');

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

  // The email is interpolated into a PostgREST `or=` filter below; a value with
  // a comma or parenthesis could change what that filter means.
  if (!isPostgrestFilterSafe(parentEmail)) {
    return errorJson(requestId, 'Unsupported account identifier', 400);
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 1), 100);
  const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10) || 0, 0);

  const supabase = supabaseServer();

  // Messages where the parent is the sender (inbound from family) or which are
  // addressed outbound to this parent's contact.
  const { data, error, count } = await supabase
    .from('messages')
    .select(SELECT_COLUMNS, { count: 'exact' })
    .eq('tenant_id', tenantId)
    .or(`sender_contact.ilike.${parentEmail},sender_contact.ilike.web:${parentEmail}`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error(
      JSON.stringify({
        component: 'peskids.api',
        event: 'family_messages_query_failed',
        request_id: requestId,
        error_code: error.code ?? 'unknown',
      })
    );
    return errorJson(requestId, 'Failed to fetch messages', 500);
  }

  // Explicit projection: the DB projection above is the first gate, this is the
  // second, so a future `select('*')` regression still cannot widen the payload.
  const messages = ((data ?? []) as unknown as MessageRowLike[]).map(toFamilyMessageView);

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
    .select(SELECT_COLUMNS)
    .single();

  if (insertError || !inserted) {
    console.error(
      JSON.stringify({
        component: 'peskids.api',
        event: 'family_message_insert_failed',
        request_id: requestId,
        error_code: insertError?.code ?? 'unknown',
      })
    );
    return errorJson(requestId, 'Failed to send message', 500);
  }

  const message = toFamilyMessageView(inserted as unknown as MessageRowLike);

  // Fire n8n notification (best-effort, non-blocking). Carries the request id so
  // one parent message can be traced from here through the workflow.
  const n8nBase = process.env.N8N_WEBHOOK_BASE_URL?.trim();
  if (n8nBase) {
    const notifyUrl = `${n8nBase}/peskids-notify`;
    void fetch(notifyUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-request-id': requestId },
      body: JSON.stringify({
        type: 'parent_message',
        tenant_id: tenantId,
        request_id: requestId,
        message_id: message.id,
        sender_email: parentEmail,
        sender_name: parentName,
        text,
        created_at: message.created_at,
      }),
    }).catch(() => {
      console.warn(
        JSON.stringify({
          component: 'peskids.api',
          event: 'n8n_notify_failed',
          request_id: requestId,
        })
      );
    });
  }

  return successJson(requestId, { message }, 201);
}
