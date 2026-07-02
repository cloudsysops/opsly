import type { GoHighLevelService } from '@intcloudsysops/services/gohighlevel';
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

export type LeadPipelineContext = {
  leadId: string;
  email: string;
  phone: string | null;
  ghlContactId: string | null;
};

export interface PipelineRule {
  currentStage: PipelineStage;
  nextStage: PipelineStage;
  condition: (lead: LeadPipelineContext) => Promise<boolean>;
  description: string;
  source: 'messages' | 'trial_classes' | 'enrollments' | 'attendance' | 'ghl_calendar';
}

export interface RuleServices {
  supabase: SupabaseClient<Database>;
  tenantSlug: string;
  /** Legacy opt-in — trial rule falls back only when local trial_classes has no row */
  ghlService?: GoHighLevelService | null;
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
 * Condition: lead has at least one inbound message (phone, email, or legacy GHL id).
 */
function hasResponded(services: RuleServices) {
  return async (lead: LeadPipelineContext): Promise<boolean> => {
    const filters = [
      lead.phone ? `sender_contact.eq.${lead.phone}` : null,
      lead.email ? `sender_contact.eq.${lead.email}` : null,
      lead.ghlContactId ? `sender_contact.eq.${lead.ghlContactId}` : null,
      lead.ghlContactId ? `sender_contact.ilike.%${lead.ghlContactId}%` : null,
    ].filter((value): value is string => Boolean(value));

    if (filters.length === 0) return false;

    const { count, error } = await services.supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', services.tenantSlug)
      .eq('direction', 'inbound')
      .or(filters.join(','));

    if (error) return false;
    return (count ?? 0) > 0;
  };
}

/**
 * Contacted → Trial Class
 * Condition: scheduled trial in public.trial_classes (local first).
 */
function hasTrialScheduled(services: RuleServices) {
  return async (lead: LeadPipelineContext): Promise<boolean> => {
    const { count, error } = await services.supabase
      .from('trial_classes')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', services.tenantSlug)
      .eq('lead_id', lead.leadId)
      .in('status', ['scheduled', 'confirmed']);

    if (!error && (count ?? 0) > 0) {
      return true;
    }

    if (!lead.ghlContactId || !services.ghlService) {
      return false;
    }

    try {
      const appointments = await services.ghlService.getAppointments(
        services.tenantSlug,
        lead.ghlContactId
      );
      return appointments.some(
        (appointment) =>
          appointment.title?.toLowerCase().includes('trial') ||
          appointment.status === 'scheduled'
      );
    } catch {
      return false;
    }
  };
}

/**
 * Trial Class → Enrolled
 * Condition: a student linked to the lead has a paid enrollment.
 */
function hasEnrolled(services: RuleServices) {
  return async (lead: LeadPipelineContext): Promise<boolean> => {
    const studentIds = await leadStudentIds(services, lead.leadId);
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
 * Condition: linked student attended at least one class.
 */
function hasAttendedFirstClass(services: RuleServices) {
  return async (lead: LeadPipelineContext): Promise<boolean> => {
    const studentIds = await leadStudentIds(services, lead.leadId);
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

export function buildPipelineRules(services: RuleServices): PipelineRule[] {
  return [
    {
      currentStage: 'New Lead',
      nextStage: 'Contacted',
      condition: hasResponded(services),
      description: 'Lead responded to follow-up outreach',
      source: 'messages',
    },
    {
      currentStage: 'Contacted',
      nextStage: 'Trial Class',
      condition: hasTrialScheduled(services),
      description: 'Trial class booked in Peskids (local trial_classes)',
      source: 'trial_classes',
    },
    {
      currentStage: 'Trial Class',
      nextStage: 'Enrolled',
      condition: hasEnrolled(services),
      description: 'Enrolled after trial — payment completed',
      source: 'enrollments',
    },
    {
      currentStage: 'Enrolled',
      nextStage: 'Active Student',
      condition: hasAttendedFirstClass(services),
      description: 'First class attended',
      source: 'attendance',
    },
  ];
}
