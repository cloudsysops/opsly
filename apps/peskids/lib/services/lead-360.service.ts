import { leadAgingBadge, type LeadAgingBadge } from '@/lib/lead-aging';
import { decorateLeadWithCrmUrls } from '@/lib/services/dashboard.service';
import { getLeadForAdmin, type DashboardLead } from '@/lib/services/lead-admin.service';
import {
  listFollowups,
  type FollowupWithContact,
} from '@/lib/services/followup-admin.service';
import type { TrialClassWithLead } from '@/lib/services/trial-class.service';
import { minimizeLeadForStaffApi, type StaffLeadView } from '@/lib/lead-response-minimize';
import { supabaseEnrollmentLeadStore } from '@/lib/enrollment-access/store';
import { enrollmentStaffViewFromMetadata } from '@/lib/enrollment-access/staff-state';
import type { EnrollmentStaffView } from '@/lib/enrollment-access/staff-state';
import type { EnrollmentTimelineKind } from '@/lib/enrollment-access/types';

export type Lead360TimelineKind =
  | 'lead_created'
  | 'followup'
  | 'enrollment'
  | 'class'
  | 'twenty_sync'
  | EnrollmentTimelineKind;

export type Lead360TimelineEntry = {
  at: string;
  kind: Lead360TimelineKind;
  label: string;
};

export type Lead360View = {
  lead: StaffLeadView;
  followups: FollowupWithContact[];
  /** Leftover trial_classes are not a canonical stage; always empty. */
  trials: TrialClassWithLead[];
  aging_badge: LeadAgingBadge | null;
  timeline: Lead360TimelineEntry[];
  enrollment: EnrollmentStaffView;
};

const FOLLOWUP_TYPE_LABEL: Record<FollowupWithContact['type'], string> = {
  call: 'Llamada',
  email: 'Correo',
  sms: 'Mensaje',
  'in-person': 'Visita presencial',
};

const FOLLOWUP_STATUS_LABEL: Record<FollowupWithContact['status'], string> = {
  pending: 'pendiente',
  completed: 'completado',
  cancelled: 'cancelado',
};

function isoOrFallback(value: string | undefined | null, fallback: string): string {
  if (value && !Number.isNaN(Date.parse(value))) {
    return value;
  }
  return fallback;
}

function buildFollowupTimelineEntries(followups: FollowupWithContact[]): Lead360TimelineEntry[] {
  return followups.map((followup) => ({
    at: isoOrFallback(followup.created_at, followup.due_date),
    kind: 'followup' as const,
    label: `Seguimiento (${FOLLOWUP_TYPE_LABEL[followup.type]}): ${FOLLOWUP_STATUS_LABEL[followup.status]}`,
  }));
}

function buildTwentySyncEntry(lead: DashboardLead): Lead360TimelineEntry {
  const status = lead.twenty_sync_status ?? 'pending';
  let label: string;
  if (status === 'synced') {
    label = 'Registro sincronizado con Twenty CRM';
  } else if (status === 'warning') {
    label = 'Sync parcial con Twenty CRM';
  } else if (lead.twenty_person_id || lead.twenty_opportunity_id) {
    label = 'Sync con Twenty CRM en progreso';
  } else {
    label = 'Pendiente de sync con Twenty CRM';
  }

  return {
    at: lead.created_at ?? new Date().toISOString(),
    kind: 'twenty_sync',
    label,
  };
}

const ENROLLMENT_TIMELINE_LABEL: Record<EnrollmentTimelineKind, string> = {
  'enrollment.link.created': 'Enlace de matrícula creado',
  'enrollment.link.opened': 'Enlace de matrícula abierto',
  'enrollment.form.submitted': 'Formulario de matrícula enviado',
  'family.created': 'Familia creada',
  'family.linked': 'Familia vinculada',
  'student.created': 'Estudiante creado',
  'student.linked': 'Estudiante vinculado',
  'student.enrolled': 'Estudiante matriculado',
  'whatsapp.draft.created': 'Borrador de WhatsApp preparado',
  'whatsapp.opened': 'WhatsApp abierto',
  'whatsapp.sent_confirmed': 'WhatsApp confirmado por staff',
};

function buildLead360Timeline(
  lead: DashboardLead,
  followups: FollowupWithContact[],
  enrollmentEntries: Array<{ at: string; kind: EnrollmentTimelineKind }>
): Lead360TimelineEntry[] {
  const entries: Lead360TimelineEntry[] = [];

  if (lead.created_at) {
    entries.push({
      at: lead.created_at,
      kind: 'lead_created',
      label: 'Interesado registrado',
    });
  }

  entries.push(...buildFollowupTimelineEntries(followups));
  entries.push(buildTwentySyncEntry(lead));
  entries.push(
    ...enrollmentEntries.map((entry) => ({
      at: entry.at,
      kind: entry.kind,
      label: ENROLLMENT_TIMELINE_LABEL[entry.kind],
    }))
  );

  return entries.sort((a, b) => b.at.localeCompare(a.at));
}

export async function getLead360(leadId: string, tenantSlug: string): Promise<Lead360View | null> {
  const rawLead = await getLeadForAdmin(leadId, tenantSlug);
  if (!rawLead) {
    return null;
  }

  const lead = decorateLeadWithCrmUrls(rawLead);
  const followups = await listFollowups({ contact_type: 'lead', contact_id: leadId });
  const enrollmentLead = await supabaseEnrollmentLeadStore.getById(leadId, tenantSlug);
  const enrollment = enrollmentStaffViewFromMetadata(enrollmentLead?.metadata ?? {});

  const aging_badge =
    lead.created_at != null ? leadAgingBadge(lead.status, lead.created_at) : null;

  return {
    lead: minimizeLeadForStaffApi(lead),
    followups,
    trials: [],
    aging_badge,
    timeline: buildLead360Timeline(
      lead,
      followups,
      enrollmentLead?.metadata.enrollment_timeline ?? []
    ),
    enrollment,
  };
}
