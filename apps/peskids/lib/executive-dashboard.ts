/**
 * Pure executive-dashboard builders (PR-PRO-8).
 * No I/O — unit-testable KPIs, agenda, and rule-based next actions.
 */

import { isUncontactedLeadStatus, leadAgingBadge } from '@/lib/lead-aging';
import type { DashboardData, DashboardExecutiveSummary } from '@/lib/types';

export const PESKIDS_DASHBOARD_TIMEZONE =
  process.env.PESKIDS_TIMEZONE?.trim() || 'America/Bogota';

type LeadRow = DashboardData['new_leads'][number];
type FollowupRow = DashboardData['followups'][number];
type TrialRow = {
  id: string;
  lead_id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  status: string;
  created_at?: string;
};
type IntegrationStatus = DashboardData['integration_status'];

const SOURCE_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  website: 'Web',
  referral: 'Recomendación',
  whatsapp: 'WhatsApp',
  other: 'Otro',
};

const FUNNEL_STAGES: Array<{
  stage: keyof DashboardData['sales_analytics']['lead_status_counts'];
  label: string;
}> = [
  { stage: 'new', label: 'Nuevos' },
  { stage: 'contacted', label: 'Contactados' },
  { stage: 'trial', label: 'Clase de prueba' },
  { stage: 'enrolled', label: 'Matriculados' },
];

const ACTIVE_TRIAL_STATUSES = new Set(['scheduled', 'confirmed', 'completed', 'attended', 'no_show']);

export function calendarDateInTz(
  now: Date = new Date(),
  timeZone: string = PESKIDS_DASHBOARD_TIMEZONE
): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function hourInTz(
  now: Date = new Date(),
  timeZone: string = PESKIDS_DASHBOARD_TIMEZONE
): number {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour: 'numeric',
      hour12: false,
    }).format(now)
  );
  return Number.isFinite(hour) ? hour % 24 : 0;
}

export function addCalendarDays(isoDate: string, days: number): string {
  const cursor = new Date(`${isoDate}T12:00:00.000Z`);
  cursor.setUTCDate(cursor.getUTCDate() + days);
  return cursor.toISOString().slice(0, 10);
}

/** Monday-start ISO week for a YYYY-MM-DD calendar date. */
export function startOfWeekMonday(isoDate: string): string {
  const cursor = new Date(`${isoDate}T12:00:00.000Z`);
  const weekday = cursor.getUTCDay(); // 0 = Sunday
  const diff = weekday === 0 ? -6 : 1 - weekday;
  return addCalendarDays(isoDate, diff);
}

export function startOfMonth(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

function normalizeSource(value: string | null | undefined): string {
  const normalized = value?.trim().toLowerCase() ?? '';
  if (!normalized) return 'other';
  if (['instagram', 'ig', 'insta'].includes(normalized)) return 'instagram';
  if (['facebook', 'fb', 'meta'].includes(normalized)) return 'facebook';
  if (['website', 'web', 'site', 'direct', 'organic', 'search', 'google'].includes(normalized)) {
    return 'website';
  }
  if (['referral', 'friend', 'referido', 'recommendation', 'recomendation'].includes(normalized)) {
    return 'referral';
  }
  if (normalized.includes('whatsapp') || normalized === 'wa') return 'whatsapp';
  return 'other';
}

function isEnrolledStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === 'enrolled' || normalized === 'active' || normalized === 'renewal';
}

function isOverdueFollowup(followup: FollowupRow, today: string): boolean {
  if (followup.status !== 'pending') return false;
  return followup.due_date.slice(0, 10) < today;
}

function isDueTodayFollowup(followup: FollowupRow, today: string): boolean {
  if (followup.status !== 'pending') return false;
  return followup.due_date.slice(0, 10) === today;
}

function pct(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null;
  return Math.round((numerator / denominator) * 100);
}

function leadHref(leadId: string): string {
  return `/admin/interesados/${encodeURIComponent(leadId)}`;
}

function formatTimeLabel(time: string | null | undefined): string {
  const raw = time?.trim();
  if (!raw) return 'Sin hora';
  return raw.slice(0, 5);
}

export function buildExecutiveDashboard(input: {
  leads: LeadRow[];
  followups: FollowupRow[];
  trials: TrialRow[];
  salesStatusCounts: DashboardData['sales_analytics']['lead_status_counts'];
  avgHoursToFirstFollowup: number | null;
  integrationStatus: IntegrationStatus;
  enrollmentsThisMonth: number;
  recentMessages: DashboardData['recent_messages'];
  now?: Date;
  timeZone?: string;
}): DashboardExecutiveSummary {
  const now = input.now ?? new Date();
  const timeZone = input.timeZone ?? PESKIDS_DASHBOARD_TIMEZONE;
  const today = calendarDateInTz(now, timeZone);
  const weekStart = startOfWeekMonday(today);
  const hour = hourInTz(now, timeZone);
  const greeting = greetingForHour(hour);

  const uncontactedLeads = input.leads.filter((lead) => isUncontactedLeadStatus(lead.status));
  const overdueFollowups = input.followups.filter((row) => isOverdueFollowup(row, today));
  const dueTodayFollowups = input.followups.filter((row) => isDueTodayFollowup(row, today));

  const activeTrials = input.trials.filter((trial) => {
    const status = trial.status.trim().toLowerCase();
    return !status || ACTIVE_TRIAL_STATUSES.has(status);
  });

  const trialsToday = activeTrials.filter((trial) => trial.scheduled_date === today);
  const trialsThisWeek = activeTrials.filter(
    (trial) => trial.scheduled_date >= weekStart && trial.scheduled_date <= today
  );

  const leadsWithTrial = new Set(activeTrials.map((trial) => trial.lead_id));
  const enrolledLeads = input.leads.filter((lead) => isEnrolledStatus(lead.status));
  const enrolledWithTrial = enrolledLeads.filter((lead) => leadsWithTrial.has(lead.id));

  const leadToTrialPct = pct(leadsWithTrial.size, input.leads.length);
  const trialToEnrollPct = pct(enrolledWithTrial.length, leadsWithTrial.size);

  const sourceBuckets = new Map<string, { total: number; enrolled: number }>();
  for (const lead of input.leads) {
    const key = normalizeSource(lead.referral_source);
    const bucket = sourceBuckets.get(key) ?? { total: 0, enrolled: 0 };
    bucket.total += 1;
    if (isEnrolledStatus(lead.status)) bucket.enrolled += 1;
    sourceBuckets.set(key, bucket);
  }

  let bestSource: DashboardExecutiveSummary['kpis']['best_source'] = null;
  for (const [key, bucket] of sourceBuckets.entries()) {
    if (bucket.total < 2) continue;
    const conversionPct = pct(bucket.enrolled, bucket.total);
    if (conversionPct === null) continue;
    if (!bestSource || conversionPct > bestSource.conversion_pct) {
      bestSource = {
        key,
        label: SOURCE_LABELS[key] ?? key,
        conversion_pct: conversionPct,
        sample_size: bucket.total,
      };
    }
  }

  const aging48 = uncontactedLeads.filter(
    (lead) => leadAgingBadge(lead.status, lead.created_at, now)?.bucket === 'escalation_48h'
  );
  const aging24 = uncontactedLeads.filter(
    (lead) => leadAgingBadge(lead.status, lead.created_at, now)?.bucket === 'reminder_24h'
  );

  const pendingSupport = input.recentMessages.filter((msg) => {
    const status = msg.status ?? 'pending_approval';
    return (
      (status === 'pending' || status === 'pending_approval') && msg.conversation_mode === 'support'
    );
  }).length;

  const priority_tasks: DashboardExecutiveSummary['priority_tasks'] = [];
  let priority = 1;

  if (pendingSupport > 0) {
    priority_tasks.push({
      id: 'support-pending',
      priority: priority++,
      title: 'Atender soporte de familias',
      detail: `${pendingSupport} mensaje(s) de soporte pendientes.`,
      href: '/admin#mensajes',
      tone: 'coral',
    });
  }
  if (overdueFollowups.length > 0) {
    priority_tasks.push({
      id: 'overdue-followups',
      priority: priority++,
      title: 'Cerrar seguimientos vencidos',
      detail: `${overdueFollowups.length} seguimiento(s) con fecha anterior a hoy.`,
      href: '/admin#seguimientos',
      tone: 'coral',
    });
  }
  if (aging48.length > 0) {
    priority_tasks.push({
      id: 'aging-48',
      priority: priority++,
      title: 'Escalar sin contacto +48h',
      detail: `${aging48.length} interesado(s) sin primer contacto.`,
      href: '/admin/pipeline',
      tone: 'coral',
    });
  }
  if (aging24.length > 0) {
    priority_tasks.push({
      id: 'aging-24',
      priority: priority++,
      title: 'Contactar sin respuesta +24h',
      detail: `${aging24.length} interesado(s) esperando primer contacto.`,
      href: '/admin/pipeline',
      tone: 'amber',
    });
  }
  if (trialsToday.length > 0) {
    priority_tasks.push({
      id: 'trials-today',
      priority: priority++,
      title: 'Confirmar clases de prueba de hoy',
      detail: `${trialsToday.length} clase(s) en agenda.`,
      href: '/admin#agenda',
      tone: 'teal',
    });
  }
  if (dueTodayFollowups.length > 0) {
    priority_tasks.push({
      id: 'followups-today',
      priority: priority++,
      title: 'Seguimientos de hoy',
      detail: `${dueTodayFollowups.length} pendiente(s) con vencimiento hoy.`,
      href: '/admin#seguimientos',
      tone: 'amber',
    });
  }
  if (priority_tasks.length === 0) {
    priority_tasks.push({
      id: 'all-clear',
      priority: 1,
      title: 'Sin urgencias — revisar captación',
      detail:
        input.leads.length > 0
          ? `${input.leads.length} interesado(s) en el periodo. Revisa el embudo y el pipeline.`
          : 'Sin interesados en el periodo. Revisa el formulario público y el digest.',
      href: '/admin/pipeline',
      tone: 'green',
    });
  }

  const agenda_today: DashboardExecutiveSummary['agenda_today'] = [
    ...trialsToday.map((trial) => ({
      id: `trial-${trial.id}`,
      kind: 'trial' as const,
      title: `Clase de prueba · ${trial.status}`,
      time_label: formatTimeLabel(trial.scheduled_time),
      href: leadHref(trial.lead_id),
    })),
    ...dueTodayFollowups.slice(0, 8).map((followup) => ({
      id: `followup-${followup.id}`,
      kind: 'followup' as const,
      title: `Seguimiento ${followup.type} · ${followup.contact_type}`,
      time_label: 'Hoy',
      href:
        followup.contact_type === 'lead'
          ? leadHref(followup.contact_id)
          : '/admin#seguimientos',
    })),
  ];

  const funnel = FUNNEL_STAGES.map(({ stage, label }) => ({
    stage,
    label,
    count: input.salesStatusCounts[stage] ?? 0,
  }));

  const recent_activity: DashboardExecutiveSummary['recent_activity'] = [
    ...input.leads.slice(0, 5).map((lead) => ({
      id: `lead-${lead.id}`,
      at: lead.created_at,
      label: `Interesado: ${lead.name}`,
      href: leadHref(lead.id),
    })),
    ...input.recentMessages.slice(0, 3).map((msg) => ({
      id: `msg-${msg.id}`,
      at: msg.created_at,
      label: `Mensaje: ${msg.sender_name ?? msg.sender_contact}`,
      href: '/admin#mensajes',
    })),
  ]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 8);

  const integration_issues = (
    Object.values(input.integrationStatus) as IntegrationStatus[keyof IntegrationStatus][]
  )
    .filter((item) => item.enabled && (item.status === 'offline' || item.status === 'warning'))
    .map((item) => ({
      label: item.label,
      detail: item.detail,
      status: item.status,
    }));

  const recommended_actions: DashboardExecutiveSummary['recommended_actions'] = priority_tasks
    .slice(0, 3)
    .map((task) => ({
      title: task.title,
      detail: task.detail,
      href: task.href,
    }));

  const summary_line = [
    `${input.leads.length} interesados nuevos`,
    `${uncontactedLeads.length} sin contactar`,
    `${overdueFollowups.length} seguimientos vencidos`,
    `${trialsToday.length} trials hoy`,
  ].join(' · ');

  return {
    timezone: timeZone,
    as_of: now.toISOString(),
    greeting,
    summary_line,
    kpis: {
      new_leads: input.leads.length,
      uncontacted: uncontactedLeads.length,
      overdue_followups: overdueFollowups.length,
      trials_today: trialsToday.length,
      trials_this_week: trialsThisWeek.length,
      enrollments_this_month: input.enrollmentsThisMonth,
      lead_to_trial_pct: leadToTrialPct,
      trial_to_enroll_pct: trialToEnrollPct,
      avg_hours_to_first_contact: input.avgHoursToFirstFollowup,
      best_source: bestSource,
    },
    priority_tasks,
    agenda_today,
    funnel,
    recent_activity,
    integration_issues,
    recommended_actions,
  };
}
