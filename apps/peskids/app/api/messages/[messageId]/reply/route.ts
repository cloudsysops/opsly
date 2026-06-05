import { NextRequest } from 'next/server';
import { validateStaffSession } from '@/lib/staff-auth';
import { enqueueApprovedReply } from '@/lib/n8n-send';
import { supabaseServer } from '@/lib/supabase';
import { errorJson, resolveRequestId, successJson } from '../../../../../lib/api-response';

export async function POST(req: NextRequest, context: { params: Promise<{ messageId: string }> }) {
  const requestId = resolveRequestId(req);
  try {
    const auth = await validateStaffSession();
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }

    const { messageId } = await context.params;
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';
    const { replyText } = await req.json();

    if (!replyText || replyText.trim().length === 0) {
      return errorJson(requestId, 'Reply text cannot be empty', 400);
    }

    const supabase = supabaseServer();

    // Get original message to know source + contact
    const { data: originalMessage, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .eq('tenant_id', tenantId)
      .single();

    if (fetchError || !originalMessage) {
      return errorJson(requestId, 'Message not found', 404);
    }

    const { data: replyRecord, error: insertError } = await supabase
      .from('messages')
      .insert({
        tenant_id: tenantId,
        source: originalMessage.source,
        sender_name: 'Equipo Peskids',
        sender_contact: 'owner',
        message_text: replyText.trim(),
        external_id: `reply-${messageId}-${Date.now()}`,
        direction: 'outbound',
        parent_message_id: messageId,
        status: 'approved',
        ai_generated: false,
      })
      .select()
      .single();

    if (insertError) throw insertError;

    const sendResult = await enqueueApprovedReply({
      messageId,
      source: String(originalMessage.source),
      sender_contact: String(originalMessage.sender_contact),
      reply_text: replyText.trim(),
    });

    if (sendResult.ok) {
      await supabase
        .from('messages')
        .update({ status: 'sent' })
        .eq('id', replyRecord.id)
        .eq('tenant_id', tenantId);

      await supabase
        .from('messages')
        .update({ status: 'approved' })
        .eq('id', messageId)
        .eq('tenant_id', tenantId);
    }

    const rawBus = process.env.OPSLY_EVENT_BUS_URL?.trim() ?? '';
    const eventBus = rawBus
      ? rawBus.endsWith('/events')
        ? rawBus
        : `${rawBus.replace(/\/$/, '')}/events`
      : '';

    try {
      if (!eventBus || eventBus.includes('localhost') || eventBus.includes('127.0.0.1')) {
        throw new Error('OPSLY_EVENT_BUS_URL not configured for production');
      }
      await fetch(eventBus, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'message.replied',
          tenant_id: tenantId,
          source: originalMessage.source,
          sender_contact: originalMessage.sender_contact,
          reply_text: replyText,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.warn('Failed to emit event:', error);
      // Non-blocking: continue even if event bus fails
    }

    return successJson(
      requestId,
      {
        ok: true,
        success: true,
        replyRecord,
        n8n: sendResult,
        message: sendResult.ok
          ? 'Respuesta registrada y encolada en n8n para envío.'
          : 'Respuesta registrada. n8n no disponible — revisa N8N_WEBHOOK_BASE_URL.',
      },
      201
    );
  } catch (error) {
    console.error('Reply API error:', error, { request_id: requestId });
    return errorJson(requestId, 'Failed to process reply', 500);
  }
}
