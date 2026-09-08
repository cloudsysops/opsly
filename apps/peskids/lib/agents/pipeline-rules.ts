import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';

export type PipelineStage =
  | 'New Lead'
  | 'Contacted'
  | 'Enrollment'
  | 'Enrolled'
  | 'Active Student'
  | 'Renewal';

export type LocalLeadStatus = Database['public']['Tables']['leads']['Row']['status'];

export const PIPELINE_STAGE_TO_LOCAL_STATUS: Record<PipelineStage, LocalLeadStatus> = {
  'New Lead': 'new',
  Contacted: 'contacted',
  Enrollment: 'trial',
  Enrolled: 'enrolled',
  'Active Student': 'active',
  Renewal: 'renewal',
};

export const LOCAL_STATUS_TO_PIPELINE_STAGE: Partial<Record<LocalLeadStatus, PipelineStage>> = {
  new: 'New Lead',
  contacted: 'Contacted',
  trial: 'Enrollment',
  enrolled: 'Enrolled',
  active: 'Active Student',
  renewal: 'Renewal',
};

export interface PipelineRule {
  currentStage: PipelineStage;
  nextStage: PipelineStage;
  /** Evaluates using public.leads.id — never an external CRM contact id. */
  condition: (leadId: string) => Promise<boolean>;
  description: string;
  source: 'messages' | 'followups' | 'students' | 'enrollments' | 'attendance';
}

export interface RuleServices {
  supabase: SupabaseClient<Database>;
  tenantSlug: string;
}

async function loadLeadChannels(
  services: RuleServices,
  leadId: string
): Promise<{ email: string; phone: string | null } | null> {
  const { data, error } = await services.supabase
    .from('leads')
    .select('email, phone')
    .eq('id', leadId)
    .eq('tenant_id', services.tenantSlug)
    .maybeSingle();

  if (error || !data) return null;
  return { email: data.email, phone: data.phone };
}

async function leadStudentIds(
  services: RuleServices,
  leadId: string
): Promise<string[]> {
  const { data, error } = await services.supabase
    .from('students')
    .select('id')
    .eq('tenant_id', services.tenantSlug)
    .eq('source_lead_id', leadId);

  if (error || !data?.length) return [];
  return data.map((row) => row.id);
}

/**
 * New Lead → Contacted
 * Local signals: inbound message (phone/email) or completed staff followup on the lead.
 */
function hasHumanContact(services: RuleServices) {
  return async (leadId: string): Promise<boolean> => {
    const channels = await loadLeadChannels(services, leadId);
    const filters = [
      channels?.phone ? `sender_contact.eq.${channels.phone}` : null,
      channels?.email ? `sender_contact.eq.${channels.email}` : null,
    ].filter((value): value is string => Boolean(value));

    if (filters.length > 0) {
      const { count, error } = await services.supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', services.tenantSlug)
        .eq('direction', 'inbound')
        .or(filters.join(','));

      if (!error && (count ?? 0) > 0) {
        return true;
      }
    }

    const { count: followupCount, error: followupError } = await services.supabase
      .from('followups')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', services.tenantSlug)
      .eq('contact_id', leadId)
      .eq('contact_type', 'lead')
      .eq('status', 'completed');

    if (followupError) return false;
    return (followupCount ?? 0) > 0;
  };
}

/**
 * Contacted → Enrollment
 * Local signal: student linked via source_lead_id (enrollment form submitted).
 * Trial-class rows are not a canonical stage.
 */
function hasEnrollmentStarted(services: RuleServices) {
  return async (leadId: string): Promise<boolean> => {
    const studentIds = await leadStudentIds(services, leadId);
    return studentIds.length > 0;
  };
}

/**
 * Enrollment → Enrolled
 * Student linked via source_lead_id with paid enrollment.
 */
function hasEnrolled(services: RuleServices) {
  return async (leadId: string): Promise<boolean> => {
    const studentIds = await leadStudentIds(services, leadId);
    if (studentIds.length === 0) return false;

    const { count, error } = await services.supabase
      .schema('peskids')
      .from('class_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_slug', services.tenantSlug)
      .in('student_id', studentIds)
      .eq('payment_status', 'paid');

    if (error) return false;
    return (count ?? 0) > 0;
  };
}

/**
 * Enrolled → Active Student
 * Linked student has attendance evidence in class_enrollments.
 */
function hasAttendedFirstClass(services: RuleServices) {
  return async (leadId: string): Promise<boolean> => {
    const studentIds = await leadStudentIds(services, leadId);
    if (studentIds.length === 0) return false;

    const { count, error } = await services.supabase
      .schema('peskids')
      .from('class_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_slug', services.tenantSlug)
      .in('student_id', studentIds)
      .or('attendance.eq.present,status.eq.attended');

    if (error) return false;
    return (count ?? 0) > 0;
  };
}

/**
 * Active Student → Renewal
 * No per-student billing cycle is tracked yet (class_enrollments/payments have
 * no cycle-end date) — renewal is signaled for every linked active student
 * within RENEWAL_WINDOW_DAYS of calendar month-end. Revisit once per-student
 * billing cycles are tracked.
 */
export const RENEWAL_WINDOW_DAYS = 7;

export function isWithinRenewalWindow(referenceDate: Date): boolean {
  const endOfMonth = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth() + 1,
    0
  );
  const daysUntilMonthEnd = Math.ceil(
    (endOfMonth.getTime() - referenceDate.getTime()) / (24 * 60 * 60 * 1000)
  );
  return daysUntilMonthEnd >= 0 && daysUntilMonthEnd <= RENEWAL_WINDOW_DAYS;
}

function hasActiveStudentNearRenewal(services: RuleServices, now: Date) {
  return async (leadId: string): Promise<boolean> => {
    if (!isWithinRenewalWindow(now)) return false;

    const studentIds = await leadStudentIds(services, leadId);
    if (studentIds.length === 0) return false;

    const { count, error } = await services.supabase
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', services.tenantSlug)
      .in('id', studentIds)
      .eq('status', 'active');

    if (error) return false;
    return (count ?? 0) > 0;
  };
}

export function buildPipelineRules(
  services: RuleServices,
  now: Date = new Date()
): PipelineRule[] {
  return [
    {
      currentStage: 'New Lead',
      nextStage: 'Contacted',
      condition: hasHumanContact(services),
      description: 'Inbound message or completed staff followup on the lead',
      source: 'messages',
    },
    {
      currentStage: 'Contacted',
      nextStage: 'Enrollment',
      condition: hasEnrollmentStarted(services),
      description: 'Enrollment form submitted: student linked to lead',
      source: 'students',
    },
    {
      currentStage: 'Enrollment',
      nextStage: 'Enrolled',
      condition: hasEnrolled(services),
      description: 'Paid enrollment for student linked to lead',
      source: 'enrollments',
    },
    {
      currentStage: 'Enrolled',
      nextStage: 'Active Student',
      condition: hasAttendedFirstClass(services),
      description: 'First class attendance recorded locally',
      source: 'attendance',
    },
    {
      currentStage: 'Active Student',
      nextStage: 'Renewal',
      condition: hasActiveStudentNearRenewal(services, now),
      description: `Linked active student within ${RENEWAL_WINDOW_DAYS} days of calendar month-end (no per-student billing cycle tracked yet)`,
      source: 'enrollments',
    },
  ];
}
