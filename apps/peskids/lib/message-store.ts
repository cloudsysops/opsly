import { supabaseServer } from '@/lib/supabase';

export type MessageSource = 'whatsapp' | 'instagram' | 'web';
export type MessageDirection = 'inbound' | 'draft' | 'outbound';

export type InboundMessageInput = {
  source: MessageSource;
  sender_contact: string;
  sender_name: string;
  message_text: string;
  external_id: string;
};

export type StoredMessage = {
  id: string;
  source: MessageSource;
  sender_name: string | null;
  sender_contact: string;
  message_text: string;
  created_at: string;
  direction?: MessageDirection;
  parent_message_id?: string | null;
  ai_generated?: boolean;
  status?: 'pending' | 'approved' | 'sent' | null;
};

function tenantId(): string {
  return process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';
}

export async function storeInboundMessage(
  input: InboundMessageInput
): Promise<{ message: StoredMessage | null; error: string | null; replayed?: boolean }> {
  const supabase = supabaseServer();
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
      status: 'pending',
      ai_generated: false,
    })
    .select(
      'id, source, sender_name, sender_contact, message_text, created_at, direction, parent_message_id, ai_generated, status'
    )
    .single();

  if (error) {
    const existing = await findMessageByExternalId(input.external_id);
    if (existing) {
      return { message: existing, error: null, replayed: true };
    }
    return { message: null, error: error.message };
  }
  return { message: data as StoredMessage, error: null };
}

export async function storeDraftReply(
  parentMessageId: string,
  draftText: string,
  source: MessageSource,
  options?: { senderName?: string; status?: 'pending' | 'approved' | 'sent' | null }
): Promise<{ draft: StoredMessage | null; error: string | null }> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      tenant_id: tenantId(),
      source,
      sender_contact: 'assistant',
      sender_name: options?.senderName ?? 'Asistente Peskids',
      message_text: draftText,
      external_id: `draft-${parentMessageId}-${Date.now()}`,
      direction: 'draft',
      parent_message_id: parentMessageId,
      status: options?.status ?? 'pending',
      ai_generated: true,
    })
    .select(
      'id, source, sender_name, sender_contact, message_text, created_at, direction, parent_message_id, ai_generated, status'
    )
    .single();

  if (error) {
    return { draft: null, error: error.message };
  }
  return { draft: data as StoredMessage, error: null };
}

export async function storeOutboundMessage(params: {
  parentId: string;
  source: MessageSource;
  sender_contact: string;
  replyText: string;
  aiGenerated: boolean;
  senderName?: string;
  status?: 'pending' | 'approved' | 'sent' | null;
}): Promise<{ message: StoredMessage | null; error: string | null }> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      tenant_id: tenantId(),
      source: params.source,
      sender_contact: params.sender_contact,
      sender_name: params.senderName ?? 'Asistente Peskids',
      message_text: params.replyText,
      external_id: `auto-${params.parentId}-${Date.now()}`,
      direction: 'outbound',
      parent_message_id: params.parentId,
      status: params.status ?? 'sent',
      ai_generated: params.aiGenerated,
    })
    .select(
      'id, source, sender_name, sender_contact, message_text, created_at, direction, parent_message_id, ai_generated, status'
    )
    .single();

  if (error) {
    return { message: null, error: error.message };
  }
  return { message: data as StoredMessage, error: null };
}

export async function findMessageByExternalId(
  externalId: string
): Promise<StoredMessage | null> {
  const supabase = supabaseServer();
  const result = await supabase
    .from('messages')
    .select(
      'id, source, sender_name, sender_contact, message_text, created_at, direction, parent_message_id, ai_generated, status'
    )
    .eq('tenant_id', tenantId())
    .eq('external_id', externalId)
    .maybeSingle();

  if (!result || result.error || !result.data) {
    return null;
  }

  return result.data as StoredMessage;
}

export async function storeOutboundMessageWithExternalId(params: {
  parentId: string;
  source: MessageSource;
  sender_contact: string;
  replyText: string;
  aiGenerated: boolean;
  senderName?: string;
  status?: 'pending' | 'approved' | 'sent' | null;
  external_id: string;
}): Promise<{ message: StoredMessage | null; error: string | null }> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('messages')
    .insert({
      tenant_id: tenantId(),
      source: params.source,
      sender_contact: params.sender_contact,
      sender_name: params.senderName ?? 'Asistente Peskids',
      message_text: params.replyText,
      external_id: params.external_id,
      direction: 'outbound',
      parent_message_id: params.parentId,
      status: params.status ?? 'sent',
      ai_generated: params.aiGenerated,
    })
    .select(
      'id, source, sender_name, sender_contact, message_text, created_at, direction, parent_message_id, ai_generated, status'
    )
    .single();

  if (error) {
    return { message: null, error: error.message };
  }
  return { message: data as StoredMessage, error: null };
}

export async function getMessageById(messageId: string): Promise<StoredMessage | null> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('messages')
    .select(
      'id, source, sender_name, sender_contact, message_text, created_at, direction, parent_message_id, ai_generated, status'
    )
    .eq('id', messageId)
    .eq('tenant_id', tenantId())
    .maybeSingle();

  if (error || !data) return null;
  return data as StoredMessage;
}

export async function getConversationMessages(
  senderContact: string,
  limit: number = 12
): Promise<StoredMessage[]> {
  const supabase = supabaseServer();
  const { data, error } = await supabase
    .from('messages')
    .select(
      'id, source, sender_name, sender_contact, message_text, created_at, direction, parent_message_id, ai_generated, status'
    )
    .eq('tenant_id', tenantId())
    .eq('sender_contact', senderContact)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return [...(data as StoredMessage[])].reverse();
}
