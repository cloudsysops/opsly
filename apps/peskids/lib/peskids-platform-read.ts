import type { DashboardData } from '@/lib/types';

export type PlatformPeskidsLeadRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  class_modality: string | null;
  neighborhood: string | null;
  grade_interested: string;
  status: string;
  admin_notes: string | null;
  referral_source?: string | null;
  created_at?: string;
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

export function mapPlatformLeadRow(row: PlatformPeskidsLeadRow): DashboardLead {
  return {
    id: row.id,
    name: row.full_name,
    email: row.email,
    phone: row.phone,
    class_modality: (row.class_modality as DashboardLead['class_modality']) ?? null,
    neighborhood: row.neighborhood,
    grade_interested: row.grade_interested,
    status: mapPlatformLeadStatus(row.status),
    admin_notes: row.admin_notes,
    referral_code: null,
    referred_by_code: null,
    referral_discount_cents: 0,
    referral_redemptions: 0,
    referral_source: row.referral_source ?? null,
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
