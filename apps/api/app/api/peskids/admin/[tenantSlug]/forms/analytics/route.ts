import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api-response';
import { HTTP_STATUS } from '@/lib/constants';
import { runTrustedPortalDalForPathSlug, PORTAL_READ_ACCESS } from '@/lib/portal-tenant-dal';
import { getServiceClient } from '@/lib/supabase';

interface FormAnalytics {
  formId: string;
  formTitle: string;
  submissionCount: number;
  abandonnmentRate: number;
  avgCompletionTimeSeconds: number;
  errorCount: number;
  uniqueUsers: number;
  lastSubmissionAt?: string;
}

interface StatsResponse {
  totalSubmissions: number;
  totalForms: number;
  avgCompletionTime: number;
  totalErrors: number;
}


export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
): Promise<Response> {
  const { tenantSlug } = await params;

  return runTrustedPortalDalForPathSlug(
    request,
    tenantSlug,
    async () => {
      try {
        if (!tenantSlug) {
          return jsonError('Missing tenant slug', HTTP_STATUS.BAD_REQUEST);
        }

        const supabase = getServiceClient();

        // Fetch forms for this tenant
        const { data: forms, error: formsError } = await supabase
          .from('peskids.forms')
          .select('id, form_id, title')
          .eq('tenant_slug', tenantSlug)
          .eq('status', 'active');

        if (formsError) {
          console.error('Failed to fetch forms:', formsError);
          return jsonError('Failed to fetch forms', HTTP_STATUS.INTERNAL_ERROR);
        }

        // Fetch analytics for these forms
        const formIds = forms?.map((f) => f.id) || [];
        let formAnalytics: Array<{
          form_id: string;
          submissions_count: number;
          unique_users: number;
          avg_completion_time_seconds: number;
          abandonment_rate: number;
          error_count: number;
        }> = [];

        if (formIds.length > 0) {
          const { data: analyticsData, error: analyticsError } = await supabase
            .from('peskids.form_analytics')
            .select(
              'form_id, submissions_count, unique_users, avg_completion_time_seconds, abandonment_rate, error_count'
            )
            .eq('tenant_slug', tenantSlug)
            .in('form_id', formIds);

          if (!analyticsError && analyticsData) {
            formAnalytics = analyticsData;
          }
        }

        // Fetch latest submissions for each form
        const { data: submissions, error: submissionsError } = await supabase
          .from('peskids.form_submissions')
          .select('form_id, completed_at')
          .eq('tenant_slug', tenantSlug)
          .eq('status', 'submitted')
          .order('completed_at', { ascending: false })
          .limit(1);

        const lastSubmissionMap = new Map<string, string>();
        submissions?.forEach((sub) => {
          if (sub.form_id && sub.completed_at && !lastSubmissionMap.has(sub.form_id)) {
            lastSubmissionMap.set(sub.form_id, sub.completed_at);
          }
        });

        // Map analytics to forms
        const analyticsMap = new Map(formAnalytics.map((a) => [a.form_id, a]));

        const formsWithAnalytics: FormAnalytics[] = (forms || []).map((form) => {
          const analytics = analyticsMap.get(form.id);
          return {
            formId: form.form_id,
            formTitle: form.title,
            submissionCount: analytics?.submissions_count || 0,
            abandonnmentRate: analytics?.abandonment_rate || 0,
            avgCompletionTimeSeconds: analytics?.avg_completion_time_seconds || 0,
            errorCount: analytics?.error_count || 0,
            uniqueUsers: analytics?.unique_users || 0,
            lastSubmissionAt: lastSubmissionMap.get(form.id),
          };
        });

        // Calculate stats
        const stats: StatsResponse = {
          totalSubmissions: formsWithAnalytics.reduce((sum, f) => sum + f.submissionCount, 0),
          totalForms: formsWithAnalytics.length,
          avgCompletionTime:
            formsWithAnalytics.length > 0
              ? Math.round(
                  formsWithAnalytics.reduce((sum, f) => sum + f.avgCompletionTimeSeconds, 0) /
                    formsWithAnalytics.length
                )
              : 0,
          totalErrors: formsWithAnalytics.reduce((sum, f) => sum + f.errorCount, 0),
        };

        return jsonOk({
          forms: formsWithAnalytics,
          stats,
        });
      } catch (error) {
        console.error('Analytics endpoint error:', error);
        return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
      }
    },
    PORTAL_READ_ACCESS
  );
}
