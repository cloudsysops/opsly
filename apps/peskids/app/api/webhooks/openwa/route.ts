import { NextRequest } from 'next/server';
import { parseOpenWAWebhookRequest, sendTextMessageForTenant } from '@intcloudsysops/openwa';
import { buildPeskidsIntakeTurn } from '@/lib/peskids-intake';
import { submitLeadFromIntake } from '@/lib/peskids-lead-from-intake';
import { storeInboundMessage, storeOutboundMessage } from '@/lib/message-store';
import { triggerN8nMessagePipeline } from '@/lib/chat-assistant';
import { emitEvent } from '@/lib/events';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

/**
 * POST /api/webhooks/openwa — Peskids WhatsApp inbound (OpenWA gateway).
 */
export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const rawBody = await req.text();
  const parsed = await parseOpenWAWebhookRequest(rawBody, req.headers, 'peskids');

  if (!parsed.ok) {
    return errorJson(requestId, parsed.error, parsed.status);
  }

  const { payload, message: msg } = parsed.parsed;
  if (!msg) {
    return successJson(requestId, { skipped: true, event: payload.event });
  }

  try {
    const { message, error } = await storeInboundMessage({
      source: 'whatsapp',
      sender_contact: msg.sender,
      sender_name: msg.sender,
      message_text: msg.text,
      external_id: payload.data.id,
    });

    if (error || !message) {
      console.error('[openwa/peskids] storeInboundMessage failed', { error, requestId });
      return errorJson(requestId, 'Failed to store message', 500);
    }

    const intake = await buildPeskidsIntakeTurn({
      senderContact: msg.sender,
      senderName: msg.sender,
      source: 'whatsapp',
      latestMessage: msg.text,
    });

    const replyText = intake.reply;
    if (replyText) {
      void sendTextMessageForTenant('peskids', msg.chatId, replyText).catch(
        (err: unknown) => {
          console.error('[openwa/peskids] sendTextMessage failed', {
            to: msg.chatId,
            error: err instanceof Error ? err.message : String(err),
            requestId,
          });
        }
      );
    }

    await storeOutboundMessage({
      parentId: message.id,
      source: 'whatsapp',
      sender_contact: msg.sender,
      replyText,
      aiGenerated: true,
      senderName: 'Asistente Peskids',
      status: 'sent',
    });

    if (intake.stage === 'handoff') {
      void submitLeadFromIntake(intake.profile);
    }

    void triggerN8nMessagePipeline(message.id, msg.text).catch(() => undefined);
    void emitEvent('message.received', {
      source: 'openwa-whatsapp',
      messageId: message.id,
      sender: msg.sender,
    }).catch(() => undefined);

    return successJson(requestId, {
      messageId: message.id,
      intent: intake.stage,
      replied: Boolean(replyText),
    });
  } catch (err) {
    const msg2 = err instanceof Error ? err.message : String(err);
    console.error('[openwa/peskids] handler error', { error: msg2, requestId });
    return errorJson(requestId, 'Internal error', 500);
  }
}
