import { NextRequest } from 'next/server';
import { validateStaffSession } from '@/lib/staff-auth';
import { supabaseServer } from '@/lib/supabase';
import { storeDraftReply } from '@/lib/message-store';
import { generateStaffReplySuggestion } from '@/lib/staff-reply-assistant';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

/**
 * POST /api/messages/[messageId]/suggest-reply — "Generar respuesta" button.
 *
 * Drafts a suggestion with the LLM Gateway and saves it exactly like any
 * other draft (direction: 'draft', ai_generated: true) so it shows up the
 * next time /thread is loaded too. Never sends anything — the human still
 * has to review the text and press "Aprobar y enviar" (POST .../reply).
 */
export async function POST(req: NextRequest, context: { params: Promise<{ messageId: string }> }) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffSession();
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const { messageId } = await context.params;
  const tenantId = (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
  if (tenantId !== 'peskids') {
    return errorJson(requestId, 'Forbidden', 403);
  }

  const { data: inbound, error: fetchError } = await supabaseServer()
    .from('messages')
    .select('id, source, sender_name, sender_contact, message_text')
    .eq('id', messageId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (fetchError || !inbound) {
    return errorJson(requestId, 'Message not found', 404);
  }

  const suggestion = await generateStaffReplySuggestion({
    inboundMessageText: inbound.message_text ?? '',
    senderName: inbound.sender_name,
  });

  if (!suggestion.ok) {
    return errorJson(requestId, suggestion.error, suggestion.status);
  }

  const { draft, error: storeError } = await storeDraftReply(
    messageId,
    suggestion.reply,
    inbound.source,
    { senderName: 'Asistente Peskids (IA)' }
  );

  if (storeError || !draft) {
    console.error('Failed to store AI reply suggestion:', storeError, { request_id: requestId });
    // The suggestion itself worked — degrade to "not persisted" rather than
    // failing the whole request, so staff can still see and use it.
    return successJson(requestId, {
      ok: true,
      reply: suggestion.reply,
      from_llm: suggestion.from_llm,
      draft_id: null,
    });
  }

  return successJson(requestId, {
    ok: true,
    reply: suggestion.reply,
    from_llm: suggestion.from_llm,
    draft_id: draft.id,
  });
}
