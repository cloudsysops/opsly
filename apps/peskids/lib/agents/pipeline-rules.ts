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

export interface PipelineRule {
  currentStage: PipelineStage;
  nextStage: PipelineStage;
  condition: (ghlContactId: string) => Promise<boolean>;
  description: string;
  source: 'messages' | 'ghl_calendar' | 'enrollments' | 'attendance';
}

export interface RuleServices {
  ghlService: GoHighLevelService;
  supabase: SupabaseClient<Database>;
  tenantSlug: string;
}

/**
 * New Lead → Contacted
 * Condition: lead has sent at least one inbound message.
 */
function hasResponded(services: RuleServices) {
  return async (ghlContactId: string): Promise<boolean> => {
    const { data, error } = await services.supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', services.tenantSlug)
      .eq('direction', 'inbound')
      .or(`sender_contact.eq.${ghlContactId},sender_contact.ilike.%${ghlContactId}%`)
      .limit(1);

    if (error) return false;
    return (data?.length ?? 0) > 0;
  };
}

/**
 * Contacted → Trial Class
 * Condition: a trial class appointment is scheduled in GHL Calendar.
 */
function hasTrialScheduled(services: RuleServices) {
  return async (ghlContactId: string): Promise<boolean> => {
    try {
      const appointments = await services.ghlService.getAppointments(
        services.tenantSlug,
        ghlContactId
      );
      return appointments.some(
        (a) => a.title?.toLowerCase().includes('trial') || a.status === 'scheduled'
      );
    } catch {
      return false;
    }
  };
}

/**
 * Trial Class → Enrolled
 * Condition: an enrollment record exists with paid payment_status.
 */
function hasEnrolled(services: RuleServices) {
  return async (_ghlContactId: string): Promise<boolean> => {
    const { data, error } = await services.supabase
      .schema('peskids')
      .from('class_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_slug', services.tenantSlug)
      .eq('payment_status', 'paid')
      .limit(1);

    if (error) return false;
    return (data?.length ?? 0) > 0;
  };
}

/**
 * Enrolled → Active Student
 * Condition: at least one class enrollment with attendance = 'present'.
 */
function hasAttendedFirstClass(services: RuleServices) {
  return async (_ghlContactId: string): Promise<boolean> => {
    const { data, error } = await services.supabase
      .schema('peskids')
      .from('class_enrollments')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_slug', services.tenantSlug)
      .eq('attendance', 'present')
      .limit(1);

    if (error) return false;
    return (data?.length ?? 0) > 0;
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
      description: 'Trial class booked in GHL Calendar',
      source: 'ghl_calendar',
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
