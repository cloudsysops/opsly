import type { DashboardData } from '@/lib/types';

export type PlatformPeskidsLeadRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  lead_type?: string | null;
  service_mode?: string | null;
  class_modality: string | null;
  neighborhood: string | null;
  grade_interested: string;
  child_name?: string | null;
  birth_date?: string | null;
  document_type?: string | null;
  document_number?: string | null;
  company_name?: string | null;
  status: string;
  admin_notes: string | null;
  referral_source?: string | null;
  created_at?: string;
  franchise_id?: string | null;
  twenty_person_id?: string | null;
  twenty_opportunity_id?: string | null;
};

export type PlatformPeskidsFeedbackRow = {
  id: string;
  child_name: string;
  satisfaction: number;
  suggestion: string | null;
  status: string;
  created_at: string;
};

type DashboardLead = DashboardData['new_leads'][number];
type DashboardFeedback = DashboardData['recent_feedback'][number];

export function isMissingPlatformPeskidsTable(error: { message?: string } | null): boolean {
  const message = error?.message?.toLowerCase() ?? '';
  return (
    message.includes('peskids_leads') ||
    message.includes('peskids_feedback') ||
    message.includes('schema cache') ||
    message.includes('does not exist') ||
    message.includes('permission denied for schema platform')
  );
}

export function mapPlatformLeadStatus(
  status: string
): DashboardLead['status'] {
  switch (status) {
    case 'contacted':
      return 'contacted';
    case 'qualified':
      return 'trial';
    case 'converted':
      return 'enrolled';
    case 'lost':
      return 'archived';
    default:
      return 'new';
  }
}

function mapLeadType(value: string | null | undefined): NonNullable<DashboardLead['lead_type']> {
  if (value === 'teacher_applicant' || value === 'company') {
    return value;
  }
  return 'family';
}

function mapServiceMode(
  value: string | null | undefined,
  classModality: string | null,
  leadType: NonNullable<DashboardLead['lead_type']>
): DashboardLead['service_mode'] {
  if (value === 'llanogrande' || value === 'domicilio' || value === 'institutional') {
    return value;
  }
  if (leadType === 'company') {
    return 'institutional';
  }
  if (classModality === 'llanogrande' || classModality === 'domicilio') {
    return classModality;
  }
  return null;
}

export function mapPlatformLeadRow(row: PlatformPeskidsLeadRow): DashboardLead {
  const leadType = mapLeadType(row.lead_type);
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    phone: row.phone,
    lead_type: leadType,
    service_mode: mapServiceMode(row.service_mode, row.class_modality, leadType),
    class_modality: (row.class_modality as DashboardLead['class_modality']) ?? null,
    neighborhood: row.neighborhood,
    grade_interested: row.grade_interested,
    child_name: row.child_name ?? null,
    birth_date: row.birth_date ?? null,
    document_type: row.document_type ?? null,
    document_number: row.document_number ?? null,
    company_name: row.company_name ?? null,
    status: mapPlatformLeadStatus(row.status),
    admin_notes: row.admin_notes,
    referral_code: null,
    referred_by_code: null,
    referral_discount_cents: 0,
    referral_redemptions: 0,
    referral_source: row.referral_source ?? null,
    created_at: row.created_at ?? new Date().toISOString(),
    franchise_id: row.franchise_id ?? null,
    twenty_person_id: row.twenty_person_id ?? null,
    twenty_opportunity_id: row.twenty_opportunity_id ?? null,
  };
}

export function mapPlatformFeedbackRow(row: PlatformPeskidsFeedbackRow): DashboardFeedback {
  return {
    id: row.id,
    child_name: row.child_name,
    satisfaction: row.satisfaction,
    suggestion: row.suggestion,
    author_type: 'parent',
    subject_type: 'general',
    visibility: 'public',
    audience: 'family',
    parent_email: null,
    body: row.suggestion,
    rating: row.satisfaction,
    status: row.status === 'closed' ? 'closed' : 'new',
  };
}

export function mergeBiStudentFallback(
  activeStudentsCount: number,
  studentsByGrade: Record<string, number>,
  snapshotStudents: { active: number; by_grade: Record<string, number> } | undefined
): { activeStudentsCount: number; studentsByGrade: Record<string, number> } {
  if (activeStudentsCount > 0 || !snapshotStudents?.active) {
    return { activeStudentsCount, studentsByGrade };
  }

  return {
    activeStudentsCount: snapshotStudents.active,
    studentsByGrade: snapshotStudents.by_grade ?? {},
  };
}

export function mergeBiLeadCountFallback(
  leadCount: number,
  snapshotLeadsTotal: number | undefined
): number {
  if (leadCount > 0) {
    return leadCount;
  }
  return snapshotLeadsTotal ?? 0;
}
