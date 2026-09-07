import { NextRequest } from 'next/server';
import { triggerN8nMessagePipeline } from '@/lib/chat-assistant';
import { emitEvent } from '@/lib/events';
import { enqueueApprovedReply } from '@/lib/n8n-send';
import { storeDraftReply, storeInboundMessage, storeOutboundMessage } from '@/lib/message-store';
import { getPeskidsWhatsAppReplyMode, shouldAutoReplyWhatsApp } from '@/lib/whatsapp-reply-mode';
import { buildPeskidsIntakeTurn } from '@/lib/peskids-intake';
import { submitLeadFromIntake } from '@/lib/peskids-lead-from-intake';
import { supabaseServer } from '@/lib/supabase';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { timingSafeSecretsEqual } from '@/lib/internal-auth';
import { inboundWebhookSchema } from '@/lib/validation/inbound-webhook.schema';

type InboundSource = 'whatsapp' | 'instagram' | 'web';
type InboundPayload = {
  source?: InboundSource;
  from?: string;
  sender_contact?: string;
  name?: string;
  sender_name?: string;
  text?: string;
  message?: string;
  message_text?: string;
  messageId?: string;
  external_id?: string;
  timestamp?: string;
};

function webhookSecret(): string | undefined {
  return process.env.PESKIDS_INBOUND_WEBHOOK_SECRET || process.env.JELOU_WEBHOOK_SECRET;
}

function verifyInboundSecret(req: NextRequest): boolean {
  const secret = webhookSecret();
  if (!secret) return false;
  const header =
    req.headers.get('x-webhook-secret') || req.headers.get('x-peskids-webhook-secret') || '';
  // Constant time: `===` on a shared secret leaks the matching prefix length.
  return header.length > 0 && timingSafeSecretsEqual(header, secret);
}

function normalizePayload(body: InboundPayload): {
  source: InboundSource;
  sender_contact: string;
  sender_name: string;
  message_text: string;
  external_id: string;
} | null {
  const source = body.source ?? 'whatsapp';
  if (!['whatsapp', 'instagram', 'web'].includes(source)) {
    return null;
  }

  const sender_contact = (body.sender_contact || body.from || '').trim();
  const message_text = (body.message_text || body.text || body.message || '').trim();
  if (!sender_contact || !message_text) {
    return null;
  }

  return {
    source,
    sender_contact,
    sender_name: (body.sender_name || body.name || 'Contacto').trim(),
    message_text,
    external_id: (
      body.external_id ||
      body.messageId ||
      body.timestamp ||
      `inbound-${Date.now()}`
    ).toString(),
  };
}

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);

  try {
    if (!verifyInboundSecret(req)) {
      return errorJson(requestId, 'Unauthorized', 401);
    }

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return errorJson(requestId, 'Invalid JSON body', 400);
    }
    const parsed = inboundWebhookSchema.safeParse(raw);
    if (!parsed.success) {
      return errorJson(requestId, 'Invalid payload: require from/sender_contact and text/message', 400);
    }
    const body = parsed.data as InboundPayload;
    const normalized = normalizePayload(body);
    if (!normalized) {
      return errorJson(requestId, 'Invalid payload: require from/sender_contact and text/message', 400);
    }

    const { message, error, replayed } = await storeInboundMessage(normalized);

    if (replayed && message) {
      return successJson(requestId, { ok: true, message, replayed: true }, 200);
    }

    if (error || !message) {
      console.error('Inbound message insert failed:', error, { request_id: requestId });
      return errorJson(requestId, 'Failed to store message', 500);
    }

    const intake = await buildPeskidsIntakeTurn({
      senderContact: normalized.sender_contact,
      senderName: normalized.sender_name,
      source: normalized.source,
      latestMessage: normalized.message_text,
    });
    const whatsappReplyMode = getPeskidsWhatsAppReplyMode();
    const autoReplyEnabled = normalized.source === 'whatsapp' && shouldAutoReplyWhatsApp();
    const outboundText = intake.reply;

    let sendResult: { ok: boolean; detail: string } = {
      ok: false,
      detail: autoReplyEnabled ? 'pending send' : `reply mode=${whatsappReplyMode}`,
    };

    if (autoReplyEnabled) {
      sendResult = await enqueueApprovedReply({
        messageId: message.id,
        source: normalized.source,
        sender_contact: normalized.sender_contact,
        reply_text: outboundText,
      });
    }

    await storeOutboundMessage({
      parentId: message.id,
      source: normalized.source,
      sender_contact: normalized.sender_contact,
      replyText: outboundText,
      aiGenerated: true,
      senderName: 'Asistente Peskids',
      status: autoReplyEnabled && sendResult.ok ? 'sent' : 'pending',
    });

    if (autoReplyEnabled && sendResult.ok) {
      const supabase = supabaseServer();
      await supabase
        .from('messages')
        .update({ status: 'sent' })
        .eq('id', message.id)
        .eq('tenant_id', process.env.NEXT_PUBLIC_TENANT_ID || 'peskids');
    }

    if (intake.stage === 'handoff') {
      void submitLeadFromIntake(intake.profile);
    }

    if (intake.supportDraft) {
      await storeDraftReply(message.id, intake.supportDraft, normalized.source, {
        senderName: 'Asistente Peskids',
        status: 'pending',
      });
    } else if (!autoReplyEnabled) {
      await storeDraftReply(message.id, outboundText, normalized.source, {
        senderName: 'Asistente Peskids',
        status: 'pending',
      });
    }

    void triggerN8nMessagePipeline(message.id, normalized.message_text);

    await emitEvent('message.received', {
      source: normalized.source,
      sender_contact: normalized.sender_contact,
      message_text: normalized.message_text,
      auto_reply_mode: whatsappReplyMode,
      auto_reply_enabled: autoReplyEnabled,
      auto_reply_sent: sendResult.ok,
      auto_reply_detail: sendResult.detail,
      intake_stage: intake.stage,
      intake_progress: intake.progress,
      intake_missing_field: intake.missingField,
      timestamp: new Date().toISOString(),
    });

    return successJson(
      requestId,
      {
        ok: true,
        message,
        reply: outboundText,
        status: autoReplyEnabled && sendResult.ok ? 'sent' : 'draft',
        auto_reply_mode: whatsappReplyMode,
        stage: intake.stage,
        progress: intake.progress,
        from_llm: false,
        n8n: sendResult,
      },
      201
    );
  } catch (error) {
    console.error('Inbound webhook error:', error, { request_id: requestId });
    return errorJson(requestId, 'Internal server error', 500);
  }
}
