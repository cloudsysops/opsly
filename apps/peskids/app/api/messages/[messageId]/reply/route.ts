import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest } from '@/lib/admin-auth'
import { supabaseServer } from '@/lib/supabase'

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const auth = validateAdminRequest(req)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const { messageId } = await context.params
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'
    const { replyText } = await req.json()

    if (!replyText || replyText.trim().length === 0) {
      return NextResponse.json({ error: 'Reply text cannot be empty' }, { status: 400 })
    }

    const supabase = supabaseServer()

    // Get original message to know source + contact
    const { data: originalMessage, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', messageId)
      .eq('tenant_id', tenantId)
      .single()

    if (fetchError || !originalMessage) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    // Log reply to messages table
    const { data: replyRecord, error: insertError } = await supabase
      .from('messages')
      .insert({
        tenant_id: tenantId,
        source: originalMessage.source,
        sender_name: 'Owner', // Mark as owner reply
        sender_contact: 'owner',
        message_text: replyText,
        external_id: `reply-${messageId}`,
      })
      .select()
      .single()

    if (insertError) throw insertError

    // TODO: In Phase 2, call n8n endpoint to actually send via Baileys/Instagram
    // For now, just log that reply was approved
    // n8nEndpoint = await sendReply(originalMessage.source, originalMessage.sender_contact, replyText)

    // Emit event to Opsly event bus
    try {
      await fetch(process.env.NEXT_PUBLIC_OPSLY_EVENT_BUS_URL + '/events', {
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
      })
    } catch (error) {
      console.warn('Failed to emit event:', error)
      // Non-blocking: continue even if event bus fails
    }

    return NextResponse.json(
      {
        success: true,
        replyRecord,
        message: 'Reply approved and logged. Phase 2 will add actual send-via-WhatsApp/Instagram.',
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Reply API error:', error)
    return NextResponse.json({ error: 'Failed to process reply' }, { status: 500 })
  }
}
