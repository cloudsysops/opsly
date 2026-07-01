import { NextRequest } from 'next/server';
import { validateStaffSession } from '@/lib/staff-auth';
import { supabaseServer } from '@/lib/supabase';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

function detectConversationMode(senderContact: string): 'admissions' | 'support' {
  return senderContact.includes('web:support:') ? 'support' : 'admissions';
}

export async function GET(_req: NextRequest, context: { params: Promise<{ messageId: string }> }) {
  const requestId = resolveRequestId(_req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const { messageId } = await context.params;
  const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';
  const supabase = supabaseServer();

  const { data: inbound, error: inboundError } = await supabase
    .from('messages')
    .select('*')
    .eq('id', messageId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (inboundError || !inbound) {
    return errorJson(requestId, 'Message not found', 404);
  }

  const { data: drafts } = await supabase
    .from('messages')
    .select('id, message_text, created_at, ai_generated, status')
    .eq('tenant_id', tenantId)
    .eq('parent_message_id', messageId)
    .eq('direction', 'draft')
    .order('created_at', { ascending: false })
    .limit(1);

  const latestDraft = drafts?.[0] ?? null;

  return successJson(requestId, {
    inbound,
    status: inbound.status ?? 'pending',
    conversation_mode: detectConversationMode(inbound.sender_contact),
    suggested_reply: latestDraft?.message_text ?? null,
    draft_id: latestDraft?.id ?? null,
  });
}
