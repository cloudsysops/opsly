import { enqueueApprovedReply } from '@/lib/n8n-send';
import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';

export type MessageReplyAction = 'approve' | 'send' | 'mark_sent' | 'skip';

type MessageStatus = NonNullable<Database['public']['Tables']['messages']['Row']['status']>;
type MessageSource = Database['public']['Tables']['messages']['Row']['source'];

export type MessageReplyResult =
  | {
      ok: true;
      action: MessageReplyAction;
      status: string;
      replyRecord: Record<string, unknown> | null;
      n8n: { ok: boolean; detail: string } | null;
      message: string;
    }
  | { ok: false; status: number; error: string };

type OriginalMessage = {
  id: string;
  source: string;
  sender_contact: string;
};

function outboundStatusForAction(action: MessageReplyAction, n8nOk: boolean): MessageStatus {
  if (action === 'skip') return 'skipped';
  if (action === 'mark_sent') return 'sent';
  if (action === 'send') return n8nOk ? 'sent' : 'failed';
  return 'approved';
}

function inboundStatusForAction(action: MessageReplyAction, n8nOk: boolean): MessageStatus {
  if (action === 'skip') return 'skipped';
  if (action === 'mark_sent' || (action === 'send' && n8nOk)) return 'sent';
  if (action === 'send' && !n8nOk) return 'pending_approval';
  return 'approved';
}

export async function handleMessageReply(input: {
  tenantId: string;
  messageId: string;
  replyText: string;
  action: MessageReplyAction;
}): Promise<MessageReplyResult> {
  const { tenantId, messageId, replyText, action } = input;
  const trimmed = replyText.trim();

  if (action !== 'skip' && trimmed.length === 0) {
    return { ok: false, status: 400, error: 'Reply text cannot be empty' };
  }

  const supabase = supabaseServer();

  const { data: originalMessage, error: fetchError } = await supabase
    .from('messages')
    .select('id, source, sender_contact, tenant_id, direction')
    .eq('id', messageId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (fetchError || !originalMessage) {
    return { ok: false, status: 404, error: 'Message not found' };
  }

  const original = originalMessage as OriginalMessage;

  if (action === 'skip') {
    const { error: skipError } = await supabase
      .from('messages')
      .update({ status: 'skipped' })
      .eq('id', messageId)
      .eq('tenant_id', tenantId);

    if (skipError) {
      return { ok: false, status: 500, error: 'Failed to skip message' };
    }

    return {
      ok: true,
      action,
      status: 'skipped',
      replyRecord: null,
      n8n: null,
      message: 'Mensaje marcado como omitido.',
    };
  }

  const { data: replyRecord, error: insertError } = await supabase
    .from('messages')
    .insert({
      tenant_id: tenantId,
      source: original.source as MessageSource,
      sender_name: 'Equipo Peskids',
      sender_contact: 'owner',
      message_text: trimmed,
      external_id: `reply-${messageId}-${Date.now()}`,
      direction: action === 'approve' ? 'draft' : 'outbound',
      parent_message_id: messageId,
      status: action === 'approve' ? 'approved' : 'approved',
      ai_generated: false,
    })
    .select()
    .single();

  if (insertError || !replyRecord) {
    return { ok: false, status: 500, error: 'Failed to save reply' };
  }

  let n8nResult: { ok: boolean; detail: string } | null = null;

  if (action === 'send') {
    n8nResult = await enqueueApprovedReply({
      messageId,
      source: String(original.source),
      sender_contact: String(original.sender_contact),
      reply_text: trimmed,
    });
  }

  const n8nOk = n8nResult?.ok ?? false;
  const outboundStatus = outboundStatusForAction(action, n8nOk);
  const inboundStatus = inboundStatusForAction(action, n8nOk);

  await supabase
    .from('messages')
    .update({ status: outboundStatus })
    .eq('id', replyRecord.id)
    .eq('tenant_id', tenantId);

  await supabase
    .from('messages')
    .update({ status: inboundStatus })
    .eq('id', messageId)
    .eq('tenant_id', tenantId);

  const messageByAction: Record<MessageReplyAction, string> = {
    approve: 'Respuesta aprobada. Puedes copiarla y enviarla manualmente.',
    send: n8nOk
      ? 'Respuesta aprobada y encolada para envío.'
      : 'Respuesta guardada. No se pudo encolar el envío — revisa la configuración.',
    mark_sent: 'Mensaje marcado como enviado manualmente.',
    skip: 'Mensaje marcado como omitido.',
  };

  return {
    ok: true,
    action,
    status: inboundStatus,
    replyRecord: replyRecord as Record<string, unknown>,
    n8n: n8nResult,
    message: messageByAction[action],
  };
}

export function parseMessageReplyAction(value: unknown): MessageReplyAction {
  if (value === 'send' || value === 'mark_sent' || value === 'skip' || value === 'approve') {
    return value;
  }
  return 'approve';
}
