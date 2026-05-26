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
    .select('id, source, sender_name, sender_contact, message_text, created_at, direction, status')
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
