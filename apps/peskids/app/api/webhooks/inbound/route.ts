import { NextRequest, NextResponse } from 'next/server'
import { triggerN8nMessagePipeline } from '@/lib/chat-assistant'
import { emitEvent } from '@/lib/events'
import { enqueueApprovedReply } from '@/lib/n8n-send'
import { storeDraftReply, storeInboundMessage, storeOutboundMessage } from '@/lib/message-store'
import { getPeskidsWhatsAppReplyMode, shouldAutoReplyWhatsApp } from '@/lib/whatsapp-reply-mode'
import { buildPeskidsIntakeTurn } from '@/lib/peskids-intake'

type InboundSource = 'whatsapp' | 'instagram' | 'web'

interface InboundPayload {
  source?: InboundSource
  from?: string
  sender_contact?: string
  name?: string
  sender_name?: string
  text?: string
  message?: string
  message_text?: string
  messageId?: string
  external_id?: string
  timestamp?: string
}

function webhookSecret(): string | undefined {
  return process.env.PESKIDS_INBOUND_WEBHOOK_SECRET || process.env.JELOU_WEBHOOK_SECRET
}

function verifyInboundSecret(req: NextRequest): boolean {
  const secret = webhookSecret()
  if (!secret) return false
  const header =
    req.headers.get('x-webhook-secret') ||
    req.headers.get('x-peskids-webhook-secret') ||
    ''
  return header.length > 0 && header === secret
}

function normalizePayload(body: InboundPayload): {
  source: InboundSource
  sender_contact: string
  sender_name: string
  message_text: string
  external_id: string
} | null {
  const source = body.source ?? 'whatsapp'
  if (!['whatsapp', 'instagram', 'web'].includes(source)) {
    return null
  }

  const sender_contact = (body.sender_contact || body.from || '').trim()
  const message_text = (body.message_text || body.text || body.message || '').trim()
  if (!sender_contact || !message_text) {
    return null
  }

  return {
    source,
    sender_contact,
    sender_name: (body.sender_name || body.name || 'Contacto').trim(),
    message_text,
    external_id: (body.external_id || body.messageId || body.timestamp || `inbound-${Date.now()}`).toString(),
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!verifyInboundSecret(req)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await req.json()) as InboundPayload
    const normalized = normalizePayload(body)
    if (!normalized) {
      return NextResponse.json(
        { error: 'Invalid payload: require from/sender_contact and text/message' },
        { status: 400 }
      )
    }

    const { message, error } = await storeInboundMessage(normalized)

    if (error || !message) {
      console.error('Inbound message insert failed:', error)
      return NextResponse.json({ error: 'Failed to store message' }, { status: 500 })
    }

    const intake = await buildPeskidsIntakeTurn({
      senderContact: normalized.sender_contact,
      senderName: normalized.sender_name,
      source: normalized.source,
      latestMessage: normalized.message_text,
    })
    const whatsappReplyMode = getPeskidsWhatsAppReplyMode()
    const autoReplyEnabled = normalized.source === 'whatsapp' && shouldAutoReplyWhatsApp()
    const outboundText = intake.reply

    let sendResult: { ok: boolean; detail: string } = {
      ok: false,
      detail: autoReplyEnabled ? 'pending send' : `reply mode=${whatsappReplyMode}`,
    }

    if (autoReplyEnabled) {
      sendResult = await enqueueApprovedReply({
        messageId: message.id,
        source: normalized.source,
        sender_contact: normalized.sender_contact,
        reply_text: outboundText,
      })
    }

    await storeOutboundMessage({
      parentId: message.id,
      source: normalized.source,
      sender_contact: normalized.sender_contact,
      replyText: outboundText,
      aiGenerated: true,
      senderName: 'Asistente Peskids',
      status: autoReplyEnabled && sendResult.ok ? 'sent' : 'pending',
    })

    if (intake.supportDraft) {
      await storeDraftReply(message.id, intake.supportDraft, normalized.source, {
        senderName: 'Asistente Peskids',
        status: 'pending',
      })
    } else if (!autoReplyEnabled) {
      await storeDraftReply(message.id, outboundText, normalized.source, {
        senderName: 'Asistente Peskids',
        status: 'pending',
      })
    }

    void triggerN8nMessagePipeline(message.id, normalized.message_text)

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
    })

    return NextResponse.json(
      {
        ok: true,
        message,
        reply: outboundText,
        status: autoReplyEnabled && sendResult.ok ? 'sent' : 'draft',
        auto_reply_mode: whatsappReplyMode,
        stage: intake.stage,
        progress: intake.progress,
        profile: intake.profile,
        from_llm: false,
        n8n: sendResult,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Inbound webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
