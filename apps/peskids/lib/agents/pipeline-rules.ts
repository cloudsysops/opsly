import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/types';

export type PipelineStage =
  | 'New Lead'
  | 'Contacted'
  | 'Trial Class'
  | 'Enrolled'
  | 'Active Student'
  | 'Renewal';

export type LocalLeadStatus = Database['public']['Tables']['leads']['Row']['status'];

export const PIPELINE_STAGE_TO_LOCAL_STATUS: Record<PipelineStage, LocalLeadStatus> = {
  'New Lead': 'new',
  Contacted: 'contacted',
  'Trial Class': 'trial',
  Enrolled: 'enrolled',
  'Active Student': 'active',
  Renewal: 'renewal',
};

export const LOCAL_STATUS_TO_PIPELINE_STAGE: Partial<Record<LocalLeadStatus, PipelineStage>> = {
  new: 'New Lead',
  contacted: 'Contacted',
  trial: 'Trial Class',
  enrolled: 'Enrolled',
  active: 'Active Student',
  renewal: 'Renewal',
};

export interface PipelineRule {
  currentStage: PipelineStage;
  nextStage: PipelineStage;
  /** Evaluates using public.leads.id — never a GHL contact id. */
  condition: (leadId: string) => Promise<boolean>;
  description: string;
  source: 'messages' | 'followups' | 'trial_classes' | 'enrollments' | 'attendance';
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
 * Contacted → Trial Class
 * Local only: trial_classes for lead_id in scheduled | confirmed | attended.
 */
function hasTrialProgress(services: RuleServices) {
  return async (leadId: string): Promise<boolean> => {
    const { count, error } = await services.supabase
      .from('trial_classes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', services.tenantSlug)
      .eq('lead_id', leadId)
      .in('status', ['scheduled', 'confirmed', 'attended']);

    if (error) return false;
    return (count ?? 0) > 0;
  };
}

/**
 * Trial Class → Enrolled
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
 * Automatic rules stop at Active Student.
 * Active Student → Renewal: TODO — no local renewal signal defined in repo yet.
 */
export function buildPipelineRules(services: RuleServices): PipelineRule[] {
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
      nextStage: 'Trial Class',
      condition: hasTrialProgress(services),
      description: 'Trial class booked or attended in public.trial_classes',
      source: 'trial_classes',
    },
    {
      currentStage: 'Trial Class',
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
  ];
}
