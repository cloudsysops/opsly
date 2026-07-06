import { supabaseServer } from '@/lib/supabase';
import { fetchPlatformLeadsForDashboard } from '@/lib/peskids-platform-dashboard';
import { isMissingPlatformPeskidsTable } from '@/lib/peskids-platform-read';

export type DailyDigestLeadItem = {
  id: string;
  name: string;
  status: string;
  created_at: string;
};

export type DailyDigestFollowupItem = {
  id: string;
  contact_type: string;
  type: string;
  due_date: string;
  status: string;
};

export type DailyDigestMessageItem = {
  id: string;
  sender_name: string | null;
  sender_contact: string;
  source: string;
  message_text: string;
  created_at: string;
  status: string | null;
};

export type DailyDigestTrialClassItem = {
  id: string;
  lead_id: string;
  scheduled_date: string;
  scheduled_time: string;
  status: string;
};

export type DailyDigestPayload = {
  tenant_slug: string;
  generated_at: string;
  period: {
    start: string;
    end: string;
  };
  leads: {
    new_today: number;
    pending: number;
    new_today_items: DailyDigestLeadItem[];
    pending_items: DailyDigestLeadItem[];
  };
  followups: {
    due_today: number;
    pending_total: number;
    due_today_items: DailyDigestFollowupItem[];
  };
  messages: {
    pending_approval: number;
    pending_items: DailyDigestMessageItem[];
  };
  trial_classes: {
    scheduled_today: number;
    today_items: DailyDigestTrialClassItem[];
  };
  /** Plain-language lines for email/WhatsApp digest (n8n-friendly). */
  highlight_lines: string[];
};

const PENDING_LEAD_STATUSES = new Set(['new', 'contacted', 'trial', 'pending', 'nuevo']);

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

function isPendingLeadStatus(status: string | null | undefined): boolean {
  const normalized = status?.trim().toLowerCase() ?? '';
  if (!normalized) return true;
  if (PENDING_LEAD_STATUSES.has(normalized)) return true;
  return !['enrolled', 'archived', 'converted', 'closed', 'lost'].includes(normalized);
}

function buildHighlightLines(payload: Omit<DailyDigestPayload, 'highlight_lines'>): string[] {
  const lines: string[] = [
    `Resumen diario Peskids — ${payload.generated_at.slice(0, 10)}`,
    `Interesados nuevos hoy: ${payload.leads.new_today}`,
    `Interesados pendientes: ${payload.leads.pending}`,
    `Clases de prueba hoy: ${payload.trial_classes.scheduled_today}`,
    `Seguimientos para hoy: ${payload.followups.due_today}`,
    `Mensajes pendientes de aprobación: ${payload.messages.pending_approval}`,
  ];

  if (payload.messages.pending_approval > 0) {
    const preview = payload.messages.pending_items
      .slice(0, 3)
      .map((item) => `- ${item.sender_name ?? item.sender_contact}: ${item.message_text.slice(0, 80)}`);
    lines.push('Pendientes de aprobación:', ...preview);
  }

  return lines;
}

export async function buildDailyDigest(referenceDate = new Date()): Promise<DailyDigestPayload> {
  const slug = tenantSlug();
  const periodStart = startOfDay(referenceDate);
  const periodEnd = endOfDay(referenceDate);
  const periodStartISO = periodStart.toISOString();
  const todayDate = periodStart.toISOString().slice(0, 10);

  const supabase = supabaseServer();

  type LeadDigestRow = { id: string; name: string; status: string; created_at: string };

  let leadRows: LeadDigestRow[] = [];

  const platformLeads = await fetchPlatformLeadsForDashboard(slug, '1970-01-01T00:00:00.000Z');
  if (platformLeads.ok) {
    leadRows = platformLeads.rows.map((lead) => ({
      id: lead.id,
      name: lead.full_name,
      status: lead.status,
      created_at: lead.created_at ?? periodStartISO,
    }));
  } else if (!isMissingPlatformPeskidsTable(platformLeads.error)) {
    throw platformLeads.error;
  }

  if (leadRows.length === 0) {
    const { data: legacyLeadsRows, error: legacyLeadsError } = await supabase
      .from('leads')
      .select('id, name, status, created_at')
      .eq('tenant_id', slug)
      .order('created_at', { ascending: false })
      .limit(200);

    if (legacyLeadsError) {
      throw legacyLeadsError;
    }

    leadRows = (legacyLeadsRows ?? []).map((lead) => ({
      id: String(lead.id),
      name: String(lead.name ?? 'Sin nombre'),
      status: String(lead.status ?? 'new'),
      created_at: String(lead.created_at),
    }));
  }

  const newTodayItems: DailyDigestLeadItem[] = leadRows
    .filter((lead) => new Date(String(lead.created_at)) >= periodStart)
    .map((lead) => ({
      id: String(lead.id),
      name: String(lead.name ?? 'Sin nombre'),
      status: String(lead.status ?? 'new'),
      created_at: String(lead.created_at),
    }));

  const pendingItems: DailyDigestLeadItem[] = leadRows
    .filter((lead) => isPendingLeadStatus(String(lead.status ?? '')))
    .slice(0, 20)
    .map((lead) => ({
      id: String(lead.id),
      name: String(lead.name ?? 'Sin nombre'),
      status: String(lead.status ?? 'new'),
      created_at: String(lead.created_at),
    }));

  const { data: followups, error: followupsError } = await supabase
    .from('followups')
    .select('id, contact_type, type, due_date, status')
    .eq('tenant_id', slug)
    .order('due_date', { ascending: true });

  if (followupsError) {
    throw followupsError;
  }

  const followupRows = followups ?? [];
  const pendingFollowups = followupRows.filter((row) => row.status === 'pending');
  const dueTodayItems: DailyDigestFollowupItem[] = pendingFollowups
    .filter((row) => String(row.due_date).slice(0, 10) <= todayDate)
    .slice(0, 20)
    .map((row) => ({
      id: String(row.id),
      contact_type: String(row.contact_type),
      type: String(row.type),
      due_date: String(row.due_date),
      status: String(row.status),
    }));

  const { data: pendingMessages, error: messagesError } = await supabase
    .from('messages')
    .select('id, sender_name, sender_contact, source, message_text, created_at, status')
    .eq('tenant_id', slug)
    .eq('direction', 'inbound')
    .or('status.is.null,status.eq.pending,status.eq.pending_approval')
    .order('created_at', { ascending: false })
    .limit(20);

  if (messagesError) {
    throw messagesError;
  }

  const messageItems: DailyDigestMessageItem[] = (pendingMessages ?? []).map((row) => ({
    id: String(row.id),
    sender_name: row.sender_name ?? null,
    sender_contact: String(row.sender_contact),
    source: String(row.source),
    message_text: String(row.message_text),
    created_at: String(row.created_at),
    status: row.status ?? 'pending_approval',
  }));

  const { data: trialClasses, error: trialError } = await supabase
    .from('trial_classes')
    .select('id, lead_id, scheduled_date, scheduled_time, status')
    .eq('tenant_id', slug)
    .eq('scheduled_date', todayDate)
    .neq('status', 'cancelled')
    .order('scheduled_time', { ascending: true });

  if (trialError && !trialError.message.toLowerCase().includes('does not exist')) {
    throw trialError;
  }

  const trialItems: DailyDigestTrialClassItem[] = (trialClasses ?? []).map((row) => ({
    id: String(row.id),
    lead_id: String(row.lead_id),
    scheduled_date: String(row.scheduled_date),
    scheduled_time: String(row.scheduled_time),
    status: String(row.status),
  }));

  const base: Omit<DailyDigestPayload, 'highlight_lines'> = {
    tenant_slug: slug,
    generated_at: referenceDate.toISOString(),
    period: {
      start: periodStartISO,
      end: periodEnd.toISOString(),
    },
    leads: {
      new_today: newTodayItems.length,
      pending: pendingItems.length,
      new_today_items: newTodayItems,
      pending_items: pendingItems,
    },
    followups: {
      due_today: dueTodayItems.length,
      pending_total: pendingFollowups.length,
      due_today_items: dueTodayItems,
    },
    messages: {
      pending_approval: messageItems.length,
      pending_items: messageItems,
    },
    trial_classes: {
      scheduled_today: trialItems.length,
      today_items: trialItems,
    },
  };

  return {
    ...base,
    highlight_lines: buildHighlightLines(base),
  };
}

export function emptyDailyDigest(referenceDate = new Date()): DailyDigestPayload {
  const slug = tenantSlug();
  const periodStart = startOfDay(referenceDate);
  const periodEnd = endOfDay(referenceDate);
  const base: Omit<DailyDigestPayload, 'highlight_lines'> = {
    tenant_slug: slug,
    generated_at: referenceDate.toISOString(),
    period: {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString(),
    },
    leads: {
      new_today: 0,
      pending: 0,
      new_today_items: [],
      pending_items: [],
    },
    followups: {
      due_today: 0,
      pending_total: 0,
      due_today_items: [],
    },
    messages: {
      pending_approval: 0,
      pending_items: [],
    },
    trial_classes: {
      scheduled_today: 0,
      today_items: [],
    },
  };

  return {
    ...base,
    highlight_lines: buildHighlightLines(base),
  };
}
