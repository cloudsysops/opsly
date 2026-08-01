import { enqueueApprovedReply } from '@/lib/n8n-send';
import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import {
  approveAndDispatchWhatsApp,
  enqueueWhatsAppDraft,
} from '@/lib/integrations/whatsapp-outbound';

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
      meta?: { ok: boolean; skipped?: boolean; detail: string; outboxId?: string };
      message: string;
    }
  | { ok: false; status: number; error: string };

type OriginalMessage = {
  id: string;
  source: string;
  sender_contact: string;
};

function isWhatsAppSource(source: string): boolean {
  const n = source.trim().toLowerCase();
  return n === 'whatsapp' || n.startsWith('whatsapp') || n === 'wacrm' || n.startsWith('wacrm');
}

function outboundStatusForAction(
  action: MessageReplyAction,
  deliveryOk: boolean
): MessageStatus {
  if (action === 'skip') return 'skipped';
  if (action === 'mark_sent') return 'sent';
  if (action === 'send') return deliveryOk ? 'sent' : 'failed';
  return 'approved';
}

function inboundStatusForAction(
  action: MessageReplyAction,
  deliveryOk: boolean
): MessageStatus {
  if (action === 'skip') return 'skipped';
  if (action === 'mark_sent' || (action === 'send' && deliveryOk)) return 'sent';
  if (action === 'send' && !deliveryOk) return 'pending_approval';
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
  const whatsapp = isWhatsAppSource(String(original.source));

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
  let metaResult:
    | { ok: boolean; skipped?: boolean; detail: string; outboxId?: string }
    | undefined;

  if (whatsapp && (action === 'approve' || action === 'send')) {
    try {
      if (action === 'approve') {
        const outbox = await enqueueWhatsAppDraft({
          tenantSlug: tenantId,
          toPhone: String(original.sender_contact),
          body: trimmed,
          parentMessageId: messageId,
        });
        metaResult = {
          ok: true,
          detail: 'queued_pending_approval',
          outboxId: outbox.id,
        };
      } else {
        // action === 'send' — human approval; Meta is primary path (never mark sent if skipped)
        const dispatched = await approveAndDispatchWhatsApp({
          tenantSlug: tenantId,
          toPhone: String(original.sender_contact),
          body: trimmed,
          parentMessageId: messageId,
        });
        const send = dispatched.send;
        metaResult = {
          ok: Boolean(send?.ok),
          skipped: Boolean(send?.skipped),
          detail:
            send?.error ??
            send?.reason ??
            (send?.ok ? 'sent_via_meta' : 'meta_send_failed'),
          outboxId: dispatched.outbox.id,
        };

        // n8n only after successful Meta send — sync/automation, not a second transport
        if (send?.ok && !send.skipped) {
          n8nResult = await enqueueApprovedReply({
            messageId,
            source: String(original.source),
            sender_contact: String(original.sender_contact),
            reply_text: trimmed,
          });
        }
      }
    } catch (err) {
      metaResult = {
        ok: false,
        detail: err instanceof Error ? err.message : 'meta_outbox_error',
      };
    }
  } else if (action === 'send') {
    n8nResult = await enqueueApprovedReply({
      messageId,
      source: String(original.source),
      sender_contact: String(original.sender_contact),
      reply_text: trimmed,
    });
  }

  const deliveryOk = whatsapp
    ? Boolean(metaResult?.ok && !metaResult.skipped)
    : Boolean(n8nResult?.ok);
  const outboundStatus = outboundStatusForAction(
    action,
    action === 'send' ? deliveryOk : true
  );
  const inboundStatus = inboundStatusForAction(
    action,
    action === 'send' ? deliveryOk : true
  );

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
    approve: whatsapp
      ? 'Respuesta en cola de aprobación WhatsApp (outbox). Usa Enviar para despachar vía Meta.'
      : 'Respuesta aprobada. Puedes copiarla y enviarla manualmente.',
    send: whatsapp
      ? metaResult?.ok && !metaResult.skipped
        ? 'Respuesta aprobada y enviada por Meta Cloud.'
        : metaResult?.skipped
          ? 'Respuesta guardada en outbox. Meta outbound está desactivado o sin credenciales — no se marcó como enviado.'
          : 'Respuesta guardada. Falló el envío Meta — revisa outbox / flags.'
      : n8nResult?.ok
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
    meta: metaResult,
    message: messageByAction[action],
  };
}

export function parseMessageReplyAction(value: unknown): MessageReplyAction {
  if (value === 'send' || value === 'mark_sent' || value === 'skip' || value === 'approve') {
    return value;
  }
  return 'approve';
}
