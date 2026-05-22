import { createClient } from '@supabase/supabase-js';

interface AuditLogOptions {
  tenantSlug: string;
  actorId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function getSupabaseClient() {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function logPeskidsAuditEvent(options: AuditLogOptions): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase.rpc('peskids.log_audit_event', {
      p_tenant_slug: options.tenantSlug,
      p_actor_id: options.actorId || null,
      p_action: options.action,
      p_resource_type: options.resourceType,
      p_resource_id: options.resourceId,
      p_metadata: options.metadata || {},
      p_ip_address: options.ipAddress,
      p_user_agent: options.userAgent,
    });

    if (error) {
      console.error('Failed to log peskids audit event:', error);
      return null;
    }

    return data as string;
  } catch (error) {
    console.error('Error logging peskids audit event:', error);
    return null;
  }
}

export async function trackFormSubmissionEvent(
  tenantSlug: string,
  formId: string,
  submissionId: string,
  eventType: 'started' | 'page_viewed' | 'field_error' | 'validation_error' | 'abandoned' | 'completed',
  options?: {
    userId?: string;
    fieldName?: string;
    errorMessage?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  try {
    const supabase = getSupabaseClient();

    const { error } = await supabase
      .from('peskids.submission_events')
      .insert({
        tenant_slug: tenantSlug,
        form_id: formId,
        submission_id: submissionId,
        user_id: options?.userId || null,
        event_type: eventType,
        field_name: options?.fieldName || null,
        error_message: options?.errorMessage || null,
        metadata: options?.metadata || {},
      });

    if (error) {
      console.error('Failed to track form submission event:', error);
    }
  } catch (error) {
    console.error('Error tracking form submission event:', error);
  }
}

export async function updateFormAnalytics(
  tenantSlug: string,
  formId: string,
  date: string,
  updates: {
    submissionCount?: number;
    uniqueUsers?: number;
    avgCompletionTime?: number;
    abandonmentRate?: number;
    errorCount?: number;
  }
): Promise<void> {
  try {
    const supabase = getSupabaseClient();

    // Try to update existing record
    const { data: existing } = await supabase
      .from('peskids.form_analytics')
      .select('id')
      .eq('tenant_slug', tenantSlug)
      .eq('form_id', formId)
      .eq('date', date)
      .single();

    if (existing) {
      const { error } = await supabase
        .from('peskids.form_analytics')
        .update({
          submissions_count: updates.submissionCount,
          unique_users: updates.uniqueUsers,
          avg_completion_time_seconds: updates.avgCompletionTime,
          abandonment_rate: updates.abandonmentRate,
          error_count: updates.errorCount,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Failed to update form analytics:', error);
      }
    } else {
      // Insert new record if it doesn't exist
      const { error } = await supabase
        .from('peskids.form_analytics')
        .insert({
          tenant_slug: tenantSlug,
          form_id: formId,
          date,
          submissions_count: updates.submissionCount || 0,
          unique_users: updates.uniqueUsers || 0,
          avg_completion_time_seconds: updates.avgCompletionTime,
          abandonment_rate: updates.abandonmentRate,
          error_count: updates.errorCount || 0,
        });

      if (error) {
        console.error('Failed to create form analytics record:', error);
      }
    }
  } catch (error) {
    console.error('Error updating form analytics:', error);
  }
}
