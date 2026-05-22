import { supabaseServer } from '@/lib/supabase'

export type MessageSource = 'whatsapp' | 'instagram' | 'web'
export type MessageDirection = 'inbound' | 'draft' | 'outbound'

export type InboundMessageInput = {
  source: MessageSource
  sender_contact: string
  sender_name: string
  message_text: string
  external_id: string
}

export type StoredMessage = {
  id: string
  source: MessageSource
  sender_name: string | null
  sender_contact: string
  message_text: string
  created_at: string
  direction?: MessageDirection
  parent_message_id?: string | null
  ai_generated?: boolean
}

function tenantId(): string {
  return process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'
}

export async function storeInboundMessage(
  input: InboundMessageInput
): Promise<{ message: StoredMessage | null; error: string | null }> {
  const supabase = supabaseServer()
  const { data, error } = await supabase
    .from('messages')
    .insert({
      tenant_id: tenantId(),
      source: input.source,
      sender_contact: input.sender_contact,
      sender_name: input.sender_name,
      message_text: input.message_text,
      external_id: input.external_id,
      direction: 'inbound',
      ai_generated: false,
    })
    .select('id, source, sender_name, sender_contact, message_text, created_at, direction, parent_message_id, ai_generated')
    .single()

  if (error) {
    return { message: null, error: error.message }
  }
  return { message: data as StoredMessage, error: null }
}

export async function storeDraftReply(
  parentMessageId: string,
  draftText: string,
  source: MessageSource
): Promise<{ draft: StoredMessage | null; error: string | null }> {
  const supabase = supabaseServer()
  const { data, error } = await supabase
    .from('messages')
    .insert({
      tenant_id: tenantId(),
      source,
      sender_contact: 'assistant',
      sender_name: 'Asistente Peskids',
      message_text: draftText,
      external_id: `draft-${parentMessageId}-${Date.now()}`,
      direction: 'draft',
      parent_message_id: parentMessageId,
      status: 'pending',
      ai_generated: true,
    })
    .select('id, source, sender_name, sender_contact, message_text, created_at, direction, parent_message_id, ai_generated')
    .single()

  if (error) {
    return { draft: null, error: error.message }
  }
  return { draft: data as StoredMessage, error: null }
}

export async function getMessageById(messageId: string): Promise<StoredMessage | null> {
  const supabase = supabaseServer()
  const { data, error } = await supabase
    .from('messages')
    .select('id, source, sender_name, sender_contact, message_text, created_at, direction, parent_message_id, ai_generated')
    .eq('id', messageId)
    .eq('tenant_id', tenantId())
    .maybeSingle()

  if (error || !data) return null
  return data as StoredMessage
}
