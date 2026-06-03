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


async function fetchFormsList(
  supabase: ReturnType<typeof getServiceClient>,
  tenantSlug: string
): Promise<Array<{ id: string; form_id: string; title: string }> | Response> {
  const { data: forms, error: formsError } = await supabase
    .from('peskids.forms')
    .select('id, form_id, title')
    .eq('tenant_slug', tenantSlug)
    .eq('status', 'active');

  if (formsError) {
    console.error('Failed to fetch forms:', formsError);
    return jsonError('Failed to fetch forms', HTTP_STATUS.INTERNAL_ERROR);
  }

  return forms || [];
}

async function fetchFormAnalytics(
  supabase: ReturnType<typeof getServiceClient>,
  tenantSlug: string,
  formIds: string[]
): Promise<
  Array<{
    form_id: string;
    submissions_count: number;
    unique_users: number;
    avg_completion_time_seconds: number;
    abandonment_rate: number;
    error_count: number;
  }>
> {
  if (formIds.length === 0) {
    return [];
  }

  const { data: analyticsData, error: analyticsError } = await supabase
    .from('peskids.form_analytics')
    .select(
      'form_id, submissions_count, unique_users, avg_completion_time_seconds, abandonment_rate, error_count'
    )
    .eq('tenant_slug', tenantSlug)
    .in('form_id', formIds);

  return !analyticsError && analyticsData ? analyticsData : [];
}

async function fetchLastSubmissions(
  supabase: ReturnType<typeof getServiceClient>,
  tenantSlug: string
): Promise<Map<string, string>> {
  const { data: rawSubmissions } = await supabase
    .from('peskids.form_submissions')
    .select('form_id, completed_at')
    .eq('tenant_slug', tenantSlug)
    .eq('status', 'submitted')
    .order('completed_at', { ascending: false })
    .limit(1);

  type Row = { form_id: string; completed_at: string };
  const submissions = rawSubmissions as Row[] | null;

  const lastSubmissionMap = new Map<string, string>();
  submissions?.forEach((sub) => {
    if (sub.form_id && sub.completed_at && !lastSubmissionMap.has(sub.form_id)) {
      lastSubmissionMap.set(sub.form_id, sub.completed_at);
    }
  });

  return lastSubmissionMap;
}

interface FormAnalyticsData {
  form_id: string;
  submissions_count: number;
  unique_users: number;
  avg_completion_time_seconds: number;
  abandonment_rate: number;
  error_count: number;
}

function getAnalyticsValue<K extends keyof FormAnalyticsData>(
  analytics: FormAnalyticsData | undefined,
  key: K,
  defaultValue: number
): number {
  return analytics && analytics[key] ? (analytics[key] as number) : defaultValue;
}

function buildFormAnalyticObject(
  form: { id: string; form_id: string; title: string },
  analytics: FormAnalyticsData | undefined,
  lastSubmissionMap: Map<string, string>
): FormAnalytics {
  return {
    formId: form.form_id,
    formTitle: form.title,
    submissionCount: getAnalyticsValue(analytics, 'submissions_count', 0),
    abandonnmentRate: getAnalyticsValue(analytics, 'abandonment_rate', 0),
    avgCompletionTimeSeconds: getAnalyticsValue(analytics, 'avg_completion_time_seconds', 0),
    errorCount: getAnalyticsValue(analytics, 'error_count', 0),
    uniqueUsers: getAnalyticsValue(analytics, 'unique_users', 0),
    lastSubmissionAt: lastSubmissionMap.get(form.id),
  };
}

function calculateStats(formsWithAnalytics: FormAnalytics[]): StatsResponse {
  const totalSubmissions = formsWithAnalytics.reduce((sum, f) => sum + f.submissionCount, 0);
  const totalForms = formsWithAnalytics.length;
  const avgCompletionTime =
    formsWithAnalytics.length > 0
      ? Math.round(
          formsWithAnalytics.reduce((sum, f) => sum + f.avgCompletionTimeSeconds, 0) / totalForms
        )
      : 0;
  const totalErrors = formsWithAnalytics.reduce((sum, f) => sum + f.errorCount, 0);

  return {
    totalSubmissions,
    totalForms,
    avgCompletionTime,
    totalErrors,
  };
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

    const formsResult = await fetchFormsList(supabase, tenantSlug);
    if (formsResult instanceof Response) {
      return formsResult;
    }
    const forms = formsResult;

    const formIds = forms.map((f) => f.id);
    const [formAnalytics, lastSubmissionMap] = await Promise.all([
      fetchFormAnalytics(supabase, tenantSlug, formIds),
      fetchLastSubmissions(supabase, tenantSlug),
    ]);

    const analyticsMap = new Map(formAnalytics.map((a) => [a.form_id, a]));

    const formsWithAnalytics: FormAnalytics[] = forms.map((form) => {
      const analytics = analyticsMap.get(form.id);
      return buildFormAnalyticObject(form, analytics, lastSubmissionMap);
    });

    const stats = calculateStats(formsWithAnalytics);

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
