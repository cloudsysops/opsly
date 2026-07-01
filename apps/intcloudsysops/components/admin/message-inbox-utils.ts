import type { DashboardData } from '@/lib/types';

export type InboxMessage = DashboardData['recent_messages'][number];

export type ThreadResponse = {
  inbound: {
    message_text: string;
    sender_name: string | null;
    sender_contact: string;
    source: string;
    status?: string | null;
  };
  conversation_mode?: 'admissions' | 'support';
  status?: string | null;
  suggested_reply: string | null;
};

export const sourceTone: Record<string, 'green' | 'coral' | 'teal'> = {
  whatsapp: 'green',
  instagram: 'coral',
  web: 'teal',
};

export const statusTone: Record<string, 'amber' | 'violet' | 'green' | 'neutral'> = {
  pending: 'amber',
  approved: 'violet',
  sent: 'green',
};

export function statusLabel(status?: string | null): string {
  if (status === 'sent') return 'Enviado';
  if (status === 'approved') return 'Aprobado';
  return 'Pendiente';
}

export function conversationLabel(mode?: string): string {
  if (mode === 'support') return 'Soporte';
  if (mode === 'admissions') return 'Admisión';
  return 'Canal';
}

function normalizeDigits(value: string): string {
  return value.replace(/\D+/g, '');
}

export function getContactHref(source: string, contact: string): string | null {
  if (!contact.trim()) return null;
  if (contact.includes('@')) return `mailto:${contact.trim()}`;
  if (source === 'whatsapp') {
    const digits = normalizeDigits(contact);
    return digits ? `https://wa.me/${digits}` : null;
  }
  return null;
}
