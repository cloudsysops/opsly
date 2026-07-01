import { type NextRequest } from 'next/server';
import { validateStaffRequest } from '@/lib/staff-auth';
import { supabaseServer } from '@/lib/supabase';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { sendNotification } from '@/lib/notifications';
import type { Database } from '@/lib/types';

type MessageRow = Database['public']['Tables']['messages']['Row'];

interface RouteContext {
  params: Promise<{ contact: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const { contact: rawContact } = await context.params;
  const contact = decodeURIComponent(rawContact).trim().toLowerCase();

  if (!contact) {
    return errorJson(requestId, 'contact is required', 400);
  }

  const { searchParams } = new URL(req.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') ?? '50', 10), 1), 200);

  const tenantId = (process.env.NEXT_PUBLIC_TENANT_ID ?? 'peskids').trim();
  const supabase = supabaseServer();

  // Fetch inbound messages from the parent
  const { data: inboundData, error: inboundError } = await supabase
    .from('messages')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('sender_contact', contact)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (inboundError) {
    console.error('[admin/messages/[contact] GET inbound]', inboundError);
    return errorJson(requestId, 'Failed to fetch messages', 500);
  }

  // Fetch staff outbound replies — staff messages use sender_contact = 'staff:<staffId>'
  // but we need to find replies that are logically addressed to this parent contact.
  // We track this by storing the parent contact in the external_id field of staff messages,
  // or by fetching all staff messages and then filtering by time proximity.
  // Given the current schema, staff messages have sender_contact = 'staff:*' and direction = 'outbound'.
  // We store the parent contact in the message_text context but not in a dedicated field.
  // Best approach with current schema: fetch outbound messages and match by external_id = contact.
  const { data: outboundData, error: outboundError } = await supabase
    .from('messages')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('direction', 'outbound')
    .like('sender_contact', 'staff:%')
    .eq('external_id', contact) // We store parent contact in external_id for staff replies
    .order('created_at', { ascending: true })
    .limit(limit);

  if (outboundError) {
    console.error('[admin/messages/[contact] GET outbound]', outboundError);
    // Non-fatal: return inbound only
  }

  const inbound = (inboundData ?? []) as MessageRow[];
  const outbound = (outboundData ?? []) as MessageRow[];

  // Merge and sort by created_at
  const allMessages = [...inbound, ...outbound].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return successJson(requestId, { messages: allMessages, contact });
}

export async function POST(req: NextRequest, context: RouteContext) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const { contact: rawContact } = await context.params;
  const contact = decodeURIComponent(rawContact).trim().toLowerCase();

  if (!contact) {
    return errorJson(requestId, 'contact is required', 400);
  }

  let body: { text?: unknown };
  try {
    body = (await req.json()) as { text?: unknown };
  } catch {
    return errorJson(requestId, 'Invalid JSON body', 400);
  }

  const text = typeof body.text === 'string' ? body.text.trim() : '';
  if (!text || text.length > 2000) {
    return errorJson(requestId, 'message text is required and must be under 2000 characters', 400);
  }

  // Determine staff identity from auth result
  const staffUser = auth.method === 'supabase' && auth.user ? auth.user : null;
  const staffId = staffUser?.id ?? 'staff';
  const staffName =
    (staffUser?.user_metadata?.full_name as string | undefined) ??
    (staffUser?.user_metadata?.name as string | undefined) ??
    staffUser?.email ??
    'Equipo Peskids';

  const tenantId = (process.env.NEXT_PUBLIC_TENANT_ID ?? 'peskids').trim();
  const supabase = supabaseServer();

  const { data: inserted, error: insertError } = await supabase
    .from('messages')
    .insert({
      tenant_id: tenantId,
      source: 'web',
      sender_name: staffName,
      sender_contact: `staff:${staffId}`,
      message_text: text,
      direction: 'outbound',
      status: 'sent',
      ai_generated: false,
      external_id: contact, // Store parent contact for thread reconstruction
    })
    .select()
    .single();

  if (insertError) {
    console.error('[admin/messages/[contact] POST]', insertError);
    return errorJson(requestId, 'Failed to send message', 500);
  }

  // Notify the parent (best-effort, non-blocking)
  void sendNotification({
    type: 'submission_observation',
    recipientEmail: contact,
    title: 'Nuevo mensaje del equipo',
    body: text,
    tenantSlug: 'peskids',
    metadata: { url: '/familias' },
  }).catch((err: unknown) => {
    console.warn('[admin/messages POST] sendNotification failed', err);
  });

  return successJson(requestId, { message: inserted as MessageRow }, 201);
}
