import { normalizePhoneDigits } from '@/lib/integrations/wacrm-lead-link';
import { isWacrmExternalId } from '@/lib/integrations/wacrm-webhook-contract';

export type WacrmInboxLeadStatus =
  | 'no_conversation'
  | 'open'
  | 'pending_reply'
  | 'responded';

export type WacrmMessageRow = {
  sender_contact: string;
  message_text: string;
  created_at: string;
  status?: string | null;
  direction?: string | null;
  external_id?: string | null;
};

export type WacrmLeadInboxSnapshot = {
  status: WacrmInboxLeadStatus;
  statusLabel: string;
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  isWacrm: boolean;
};

const STATUS_LABELS: Record<WacrmInboxLeadStatus, string> = {
  no_conversation: 'Sin conversación',
  open: 'Conversación abierta',
  pending_reply: 'Pendiente de respuesta',
  responded: 'Respondido',
};

function contactMatchesMessage(phone: string, senderContact: string): boolean {
  const phoneDigits = normalizePhoneDigits(phone);
  const contactDigits = normalizePhoneDigits(senderContact);
  if (!phoneDigits || !contactDigits) {
    return false;
  }
  if (phoneDigits === contactDigits) {
    return true;
  }
  return phoneDigits.slice(-10) === contactDigits.slice(-10);
}

function isPendingInbound(status: string | null | undefined): boolean {
  const normalized = status?.trim().toLowerCase() ?? '';
  return !normalized || normalized === 'pending' || normalized === 'pending_approval';
}

export function deriveWacrmLeadInboxSnapshot(
  phone: string | null | undefined,
  messages: WacrmMessageRow[]
): WacrmLeadInboxSnapshot {
  if (!phone?.trim()) {
    return {
      status: 'no_conversation',
      statusLabel: STATUS_LABELS.no_conversation,
      lastMessageAt: null,
      lastMessagePreview: null,
      isWacrm: false,
    };
  }

  const wacrmMessages = messages
    .filter(
      (message) =>
        isWacrmExternalId(message.external_id ?? undefined) &&
        contactMatchesMessage(phone, message.sender_contact)
    )
    .sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );

  if (wacrmMessages.length === 0) {
    return {
      status: 'no_conversation',
      statusLabel: STATUS_LABELS.no_conversation,
      lastMessageAt: null,
      lastMessagePreview: null,
      isWacrm: false,
    };
  }

  const last = wacrmMessages[wacrmMessages.length - 1];
  const lastInbound = [...wacrmMessages].reverse().find((m) => m.direction === 'inbound');
  const lastOutbound = [...wacrmMessages].reverse().find((m) => m.direction === 'outbound');

  let status: WacrmInboxLeadStatus = 'open';
  if (lastInbound && isPendingInbound(lastInbound.status)) {
    const respondedAfter =
      lastOutbound &&
      new Date(lastOutbound.created_at).getTime() >=
        new Date(lastInbound.created_at).getTime();
    status = respondedAfter ? 'responded' : 'pending_reply';
  } else if (lastOutbound) {
    status = 'responded';
  }

  return {
    status,
    statusLabel: STATUS_LABELS[status],
    lastMessageAt: last.created_at,
    lastMessagePreview: last.message_text,
    isWacrm: true,
  };
}

export function countWacrmPendingReplies(messages: WacrmMessageRow[]): number {
  const byContact = new Map<string, WacrmMessageRow[]>();

  for (const message of messages) {
    if (!isWacrmExternalId(message.external_id ?? undefined)) {
      continue;
    }
    const key = normalizePhoneDigits(message.sender_contact);
    if (!key) {
      continue;
    }
    const bucket = byContact.get(key) ?? [];
    bucket.push(message);
    byContact.set(key, bucket);
  }

  let pending = 0;
  for (const bucket of byContact.values()) {
    const snapshot = deriveWacrmLeadInboxSnapshot(bucket[0]?.sender_contact ?? '', bucket);
    if (snapshot.status === 'pending_reply') {
      pending += 1;
    }
  }

  return pending;
}
