import { NextRequest, NextResponse } from 'next/server'
import { generatePeskidsChatReply, triggerN8nMessagePipeline } from '@/lib/chat-assistant'
import { storeDraftReply, storeInboundMessage } from '@/lib/message-store'
import { emitEvent } from '@/lib/events'

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

    const assistant = await generatePeskidsChatReply(messageText, body.sender_name)
    const { draft } = await storeDraftReply(message.id, assistant.reply, 'web')

    void triggerN8nMessagePipeline(message.id, messageText)

    await emitEvent('message.received', {
      source: 'web',
      sender_contact: message.sender_contact,
      message_text: messageText,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({
      ok: true,
      message_id: message.id,
      draft_id: draft?.id ?? null,
      reply: assistant.reply,
      from_llm: assistant.from_llm,
      disclaimer:
        'Respuesta orientativa. Para confirmar horarios o cupos, un asesor de Peskids te contactará.',
    })
  } catch (error) {
    console.error('Chat API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
