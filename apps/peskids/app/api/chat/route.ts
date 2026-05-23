import { NextRequest, NextResponse } from 'next/server'
import { triggerN8nMessagePipeline } from '@/lib/chat-assistant'
import { storeDraftReply, storeInboundMessage, storeOutboundMessage } from '@/lib/message-store'
import { emitEvent } from '@/lib/events'
import { buildPeskidsIntakeTurn } from '@/lib/peskids-intake'
import { submitLeadFromIntake } from '@/lib/peskids-lead-from-intake'

const MAX_MESSAGE_LENGTH = 2000

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      message?: string
      session_id?: string
      sender_name?: string
    }

    const messageText = body.message?.trim() ?? ''
    const sessionId = body.session_id?.trim() ?? 'web-anonymous'

    if (!messageText || messageText.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: 'message required (max 2000 chars)' },
        { status: 400 }
      )
    }

    const { message, error: storeError } = await storeInboundMessage({
      source: 'web',
      sender_contact: `web:${sessionId}`,
      sender_name: body.sender_name?.trim() || 'Visitante web',
      message_text: messageText,
      external_id: `web-${sessionId}-${Date.now()}`,
    })

    if (storeError || !message) {
      return NextResponse.json({ error: 'Failed to store message' }, { status: 500 })
    }

    const intake = await buildPeskidsIntakeTurn({
      senderContact: message.sender_contact,
      senderName: body.sender_name,
      source: 'web',
      latestMessage: messageText,
    })

    await storeOutboundMessage({
      parentId: message.id,
      source: 'web',
      sender_contact: message.sender_contact,
      replyText: intake.reply,
      aiGenerated: true,
      senderName: 'Asistente Peskids',
      status: 'sent',
    })

    const draft = intake.supportDraft
      ? await storeDraftReply(message.id, intake.supportDraft, 'web', {
          senderName: 'Asistente Peskids',
          status: 'pending',
        })
      : { draft: null }

    if (intake.stage === 'handoff') {
      void submitLeadFromIntake(intake.profile)
    }

    void triggerN8nMessagePipeline(message.id, messageText)

    await emitEvent('message.received', {
      source: 'web',
      sender_contact: message.sender_contact,
      message_text: messageText,
      intake_stage: intake.stage,
      intake_progress: intake.progress,
      intake_missing_field: intake.missingField,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      ok: true,
      message_id: message.id,
      draft_id: draft.draft?.id ?? null,
      reply: intake.reply,
      stage: intake.stage,
      progress: intake.progress,
      profile: intake.profile,
      support_draft: intake.supportDraft,
      from_llm: false,
      disclaimer:
        intake.stage === 'handoff'
          ? 'Gracias. Un asesor de Peskids revisará tu caso y te contactará para confirmar los siguientes pasos.'
          : 'Te haré algunas preguntas cortas para completar tu solicitud.',
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
