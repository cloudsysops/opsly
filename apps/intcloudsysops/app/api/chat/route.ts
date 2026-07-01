import { NextRequest } from 'next/server';
import { validateChatUserMessage } from '@intcloudsysops/prompt-guard';
import { triggerN8nMessagePipeline } from '@/lib/chat-assistant';
import { storeDraftReply, storeInboundMessage, storeOutboundMessage } from '@/lib/message-store';
import { emitEvent } from '@/lib/events';
import { buildPeskidsIntakeTurn } from '@/lib/peskids-intake';
import { peskidsAdmissionsChatFormRedirectPayload } from '@/lib/marketing-routes';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  const requestId = resolveRequestId(req);

  try {
    const body = (await req.json()) as {
      message?: string;
      session_id?: string;
      sender_name?: string;
      mode?: 'admissions' | 'support';
    };

    const sessionId = body.session_id?.trim() ?? 'web-anonymous';
    const mode = body.mode ?? 'admissions';

    if (mode !== 'support') {
      return successJson(requestId, peskidsAdmissionsChatFormRedirectPayload());
    }

    const validated = validateChatUserMessage(body.message ?? '');
    if (!validated.ok) {
      if (validated.safeResponse) {
        return successJson(requestId, {
          ok: true,
          message_id: null,
          draft_id: null,
          reply: validated.safeResponse,
          stage: 'blocked',
          progress: 0,
          profile: null,
          support_draft: null,
          input_mode: 'text',
          quick_replies: [],
          from_llm: false,
          disclaimer: 'Mensaje revisado por políticas de seguridad.',
        });
      }
      return errorJson(requestId, validated.error, validated.status);
    }
    const messageText = validated.message;

    const { message, error: storeError } = await storeInboundMessage({
      source: 'web',
      sender_contact: `web:${sessionId}`,
      sender_name: body.sender_name?.trim() || 'Visitante web',
      message_text: messageText,
      external_id: `web-${sessionId}-${Date.now()}`,
    });

    if (storeError || !message) {
      return errorJson(requestId, 'Failed to store message', 500);
    }

    const intake = await buildPeskidsIntakeTurn({
      senderContact: message.sender_contact,
      senderName: body.sender_name,
      source: 'web',
      latestMessage: messageText,
      mode,
    });

    await storeOutboundMessage({
      parentId: message.id,
      source: 'web',
      sender_contact: message.sender_contact,
      replyText: intake.reply,
      aiGenerated: true,
      senderName: 'Asistente Peskids',
      status: 'sent',
    });

    const draft = intake.supportDraft
      ? await storeDraftReply(message.id, intake.supportDraft, 'web', {
          senderName: 'Asistente Peskids',
          status: 'pending',
        })
      : { draft: null };

    void triggerN8nMessagePipeline(message.id, messageText);

    await emitEvent('message.received', {
      source: 'web',
      sender_contact: message.sender_contact,
      message_text: messageText,
      intake_stage: intake.stage,
      intake_progress: intake.progress,
      intake_missing_field: intake.missingField,
      timestamp: new Date().toISOString(),
    });

    return successJson(requestId, {
      ok: true,
      message_id: message.id,
      draft_id: draft.draft?.id ?? null,
      reply: intake.reply,
      stage: intake.stage,
      progress: intake.progress,
      profile: intake.profile,
      support_draft: intake.supportDraft,
      input_mode: intake.inputMode,
      quick_replies: intake.quickReplies,
      from_llm: false,
      disclaimer:
        intake.stage === 'handoff'
          ? 'Tu caso quedó listo para el equipo de soporte. Si requiere reprogramación o cancelación, primero lo valida una persona del equipo.'
          : 'Te haré algunas preguntas cortas para orientar tu caso de soporte.',
    });
  } catch (error) {
    console.error('Chat API error:', error, { request_id: requestId });
    return errorJson(requestId, 'Internal server error', 500);
  }
}
