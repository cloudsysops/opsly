import { type NextRequest } from 'next/server';
import { validateStaffRequest } from '@/lib/staff-auth';
import { supabaseServer } from '@/lib/supabase';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import type { Database } from '@/lib/types';

type MessageRow = Database['public']['Tables']['messages']['Row'];

export interface ConversationSummary {
  contact: string;
  contactName: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  source: 'whatsapp' | 'instagram' | 'web';
}

export async function GET(req: NextRequest) {
  const requestId = resolveRequestId(req);
  const auth = await validateStaffRequest(req);
  if (!auth.ok) {
    return errorJson(requestId, auth.error, auth.status);
  }

  const tenantId = (process.env.NEXT_PUBLIC_TENANT_ID ?? 'peskids').trim();
  const supabase = supabaseServer();

  // Fetch all messages for the tenant, ordered newest-first
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[admin/messages GET]', error);
    return errorJson(requestId, 'Failed to fetch messages', 500);
  }

  const messages = (data ?? []) as MessageRow[];

  // Group by contact: exclude staff outbound from being conversation roots
  // Staff messages have sender_contact starting with 'staff:'
  const contactMap = new Map<
    string,
    { messages: MessageRow[]; latestInbound: MessageRow | null }
  >();

  for (const msg of messages) {
    const isStaff = msg.sender_contact.startsWith('staff:');

    // Determine the conversation key: for staff messages, the contact is the parent's
    // original sender_contact. We track conversations by non-staff contact.
    // For inbound messages, the key is the sender_contact itself.
    // For staff (outbound) messages, we can't easily map them back without knowing
    // the parent contact, so we skip them as conversation roots.
    if (isStaff) continue;

    const key = msg.sender_contact.trim().toLowerCase();
    if (!contactMap.has(key)) {
      contactMap.set(key, { messages: [], latestInbound: null });
    }
    const entry = contactMap.get(key)!;
    entry.messages.push(msg);
    // Track the most recent inbound message (already sorted newest-first)
    if (!entry.latestInbound) {
      entry.latestInbound = msg;
    }
  }

  // Also include staff replies to count unread properly:
  // A conversation has unread messages if the last message in the thread is NOT from staff.
  // We need staff messages too to determine "last reply" — fetch them per contact via a
  // second pass over all messages.
  const allByContact = new Map<string, MessageRow[]>();
  for (const msg of messages) {
    const isStaff = msg.sender_contact.startsWith('staff:');
    if (isStaff) {
      // We need to figure out which parent contact this staff reply belongs to.
      // We cannot directly, so we find the parent contact from the messages that came
      // before this staff message in the same conversation window.
      // Best approach: look for the most recent inbound message before this staff message.
      // Since messages are newest-first, skip for now — handle unread count differently.
      continue;
    }
    const key = msg.sender_contact.trim().toLowerCase();
    if (!allByContact.has(key)) {
      allByContact.set(key, []);
    }
    allByContact.get(key)!.push(msg);
  }

  // Compute unread count: for each contact, count inbound messages that have no
  // subsequent staff reply. Since we can't easily correlate staff replies to parent
  // contacts without a conversation_id column, we use a practical heuristic:
  // fetch the most recent staff message timestamp across all messages, and count
  // inbound messages per contact that arrived after the latest staff reply overall.
  // Better: fetch staff messages and group by approximate timing.
  // Simplest correct approach: for each contact, count all inbound messages
  // where there is no staff message at all in the database with created_at > inbound.created_at
  // within a reasonable window. This is expensive in JS. Instead we'll use:
  // unreadCount = inbound messages from this contact that arrived after the last staff
  // message's created_at in the whole tenant.

  const staffMessages = (
    await supabase
      .from('messages')
      .select('created_at')
      .eq('tenant_id', tenantId)
      .like('sender_contact', 'staff:%')
      .order('created_at', { ascending: false })
      .limit(1)
  ).data;

  const lastStaffAt = staffMessages?.[0]?.created_at
    ? new Date(staffMessages[0].created_at).getTime()
    : 0;

  const conversations: ConversationSummary[] = [];

  for (const [contact, entry] of contactMap) {
    if (!entry.latestInbound) continue;

    const inboundMessages = allByContact.get(contact) ?? [];

    // Unread = inbound messages after the last staff reply (global heuristic)
    // A more accurate approach per conversation would require a conversation_id
    const unreadCount = inboundMessages.filter(
      (m) => new Date(m.created_at).getTime() > lastStaffAt
    ).length;

    conversations.push({
      contact,
      contactName: entry.latestInbound.sender_name ?? contact,
      lastMessage: entry.latestInbound.message_text,
      lastMessageAt: entry.latestInbound.created_at,
      unreadCount,
      source: entry.latestInbound.source,
    });
  }

  // Sort by most recent last message
  conversations.sort(
    (a, b) => new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime()
  );

  return successJson(requestId, { conversations });
}
