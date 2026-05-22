import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase'
import { emitEvent } from '@/lib/events'

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

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'
    const supabase = supabaseServer()

    const { data, error } = await supabase
      .from('messages')
      .insert({
        tenant_id: tenantId,
        source: normalized.source,
        sender_contact: normalized.sender_contact,
        sender_name: normalized.sender_name,
        message_text: normalized.message_text,
        external_id: normalized.external_id,
      })
      .select('id, source, sender_name, sender_contact, message_text, created_at')
      .single()

    if (error) {
      console.error('Inbound message insert failed:', error.message)
      return NextResponse.json({ error: 'Failed to store message' }, { status: 500 })
    }

    await emitEvent('message.received', {
      source: normalized.source,
      sender_contact: normalized.sender_contact,
      message_text: normalized.message_text,
      timestamp: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, message: data }, { status: 201 })
  } catch (error) {
    console.error('Inbound webhook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
