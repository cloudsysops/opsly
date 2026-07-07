import { createClient } from '@supabase/supabase-js';
import { Database } from './types';

function createServerClient(token?: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'Missing Supabase server env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (Doppler prd)'
    );
  }

  const globalHeaders: Record<string, string> = {};
  if (token) {
    globalHeaders.authorization = `Bearer ${token}`;
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: Object.keys(globalHeaders).length > 0 ? { headers: globalHeaders } : undefined,
  });
}

export const supabaseServer = (token?: string) => {
  return createServerClient(token);
};

/** Alias for webhook routes (same service-role client). */
export const getServiceClient = supabaseServer;

export type RecentMessageWithMode = Pick<
  Database['public']['Tables']['messages']['Row'],
  | 'id'
  | 'source'
  | 'sender_name'
  | 'sender_contact'
  | 'message_text'
  | 'created_at'
  | 'direction'
  | 'status'
> & {
  conversation_mode: 'admissions' | 'support';
};

function detectConversationMode(senderContact: string): 'admissions' | 'support' {
  return senderContact.includes('web:support:') ? 'support' : 'admissions';
}

export async function getRecentMessages(tenantId: string, limit: number = 10) {
  const client = supabaseServer();
  const { data, error } = await client
    .from('messages')
    .select('id, source, sender_name, sender_contact, message_text, created_at, direction, status, external_id')
    .eq('tenant_id', tenantId)
    .or('direction.eq.inbound,direction.is.null')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching recent messages:', error);
    return [];
  }

  return (data || []).map((message) => ({
    ...message,
    conversation_mode: detectConversationMode(message.sender_contact),
  })) as RecentMessageWithMode[];
}

export type WacrmMessageForInbox = Pick<
  Database['public']['Tables']['messages']['Row'],
  'sender_contact' | 'message_text' | 'created_at' | 'status' | 'direction' | 'external_id'
>;

/**
 * Both directions, no tenant-wide cap on recency — the per-lead wacrm inbox
 * badge (deriveWacrmLeadInboxSnapshot) needs a contact's full inbound +
 * outbound history to tell "no conversation" apart from "pending"/"responded".
 * getRecentMessages() is inbound-only and capped at 10 tenant-wide, so it
 * can't answer that per lead. Mirrors the wacrmMessages query in
 * daily-digest.service.ts.
 */
export async function getWacrmMessages(
  tenantId: string,
  limit: number = 200
): Promise<WacrmMessageForInbox[]> {
  const client = supabaseServer();
  const { data, error } = await client
    .from('messages')
    .select('sender_contact, message_text, created_at, status, direction, external_id')
    .eq('tenant_id', tenantId)
    .like('external_id', 'wacrm:%')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching wacrm messages:', error);
    return [];
  }

  return data ?? [];
}
