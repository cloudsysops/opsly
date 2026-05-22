import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jsonError, jsonOk } from '@/lib/api-response';
import { HTTP_STATUS } from '@/lib/constants';

interface StudentSubmission {
  submissionId: string;
  studentName: string;
  formTitle: string;
  submittedAt: string;
  status: 'pending_review' | 'reviewed' | 'graded';
  score?: number;
  feedbackProvided: boolean;
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

function mapStatusToSubmissionStatus(
  status: string,
  hasScore: boolean,
  hasFeedback: boolean
): 'pending_review' | 'reviewed' | 'graded' {
  if (status === 'graded' || hasScore) return 'graded';
  if (hasFeedback) return 'reviewed';
  return 'pending_review';
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
): Promise<Response> {
  try {
    const { tenantSlug } = await params;
    const statusParam = request.nextUrl.searchParams.get('status') || 'pending';

    if (!tenantSlug) {
      return jsonError('Missing tenant slug', HTTP_STATUS.BAD_REQUEST);
    }

    const supabase = getSupabaseClient();

    // Build query for submissions
    let query = supabase
      .from('peskids.form_submissions')
      .select('id, submission_id, form_id, form_data, completed_at, score, feedback, status')
      .eq('tenant_slug', tenantSlug);

    // Filter by status if not 'all'
    if (statusParam === 'pending') {
      query = query.is('score', null);
    } else if (statusParam === 'reviewed') {
      query = query.not('feedback', 'is', null).is('score', null);
    }

    const { data: submissions, error: submissionsError } = await query.order('completed_at', {
      ascending: false,
    });

    if (submissionsError) {
      console.error('Failed to fetch submissions:', submissionsError);
      return jsonError('Failed to fetch submissions', HTTP_STATUS.INTERNAL_ERROR);
    }

    // Fetch form details for each submission
    const formIds = new Set<string>();
    submissions?.forEach((sub) => {
      if (sub.form_id) formIds.add(sub.form_id);
    });

    const formTitleMap = new Map<string, string>();
    if (formIds.size > 0) {
      const { data: forms } = await supabase
        .from('peskids.forms')
        .select('id, title')
        .in('id', Array.from(formIds));

      forms?.forEach((form) => {
        formTitleMap.set(form.id, form.title);
      });
    }

    // Map to StudentSubmission format
    const studentSubmissions: StudentSubmission[] = (submissions || []).map((sub) => {
      const submissionStatus = mapStatusToSubmissionStatus(
        sub.status,
        Boolean(sub.score),
        Boolean(sub.feedback)
      );

      // Try to extract student name from form_data
      const studentName =
        (sub.form_data?.['student_name'] as string) ||
        (sub.form_data?.['student_full_name'] as string) ||
        'Anonymous';

      return {
        submissionId: sub.submission_id,
        studentName,
        formTitle: formTitleMap.get(sub.form_id) || 'Unknown Form',
        submittedAt: sub.completed_at || new Date().toISOString(),
        status: submissionStatus,
        score: sub.score || undefined,
        feedbackProvided: Boolean(sub.feedback),
      };
    });

    return jsonOk({
      submissions: studentSubmissions,
    });
  } catch (error) {
    console.error('Teacher submissions endpoint error:', error);
    return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
}
