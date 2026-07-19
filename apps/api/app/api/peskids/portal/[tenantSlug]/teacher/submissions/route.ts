import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api-response';
import { HTTP_STATUS } from '@intcloudsysops/constants';
import { runTrustedPortalDalForPathSlug, PORTAL_READ_ACCESS } from '@/lib/portal-tenant-dal';
import { getServiceClient } from '@/lib/supabase';

// peskids.* tables pending DB type codegen
interface PeskidsQB {
  select(cols: string): PeskidsQB;
  eq(col: string, val: unknown): PeskidsQB;
  in(col: string, vals: unknown[]): PeskidsQB;
  is(col: string, val: unknown): PeskidsQB;
  not(col: string, ...args: unknown[]): PeskidsQB;
  order(col: string, opts?: unknown): PeskidsQB;
  then<T>(r: (v: { data: unknown[] | null; error: unknown }) => T, j?: (e: unknown) => T): Promise<T>;
}
interface PeskidsClient { from(table: string): PeskidsQB; }

interface StudentSubmission {
  submissionId: string;
  studentName: string;
  formTitle: string;
  submittedAt: string;
  status: 'pending_review' | 'reviewed' | 'graded';
  score?: number;
  feedbackProvided: boolean;
}


interface SubmissionRow {
  id: string;
  submission_id: string;
  form_id: string;
  form_data: Record<string, unknown>;
  completed_at: string;
  score: number | null;
  feedback: string | null;
  status: string;
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

async function buildSubmissionsQuery(
  supabase: ReturnType<typeof getServiceClient>,
  tenantSlug: string,
  statusParam: string
) {
  const db = supabase as unknown as PeskidsClient;
  let query = db
    .from('peskids.form_submissions')
    .select('id, submission_id, form_id, form_data, completed_at, score, feedback, status')
    .eq('tenant_slug', tenantSlug);

  if (statusParam === 'pending') {
    query = query.is('score', null);
  } else if (statusParam === 'reviewed') {
    query = query.not('feedback', 'is', null).is('score', null);
  }

  const { data: rawSubs, error: submissionsError } = await query.order('completed_at', {
    ascending: false,
  });
  const submissions = rawSubs as SubmissionRow[] | null;

  if (submissionsError) {
    console.error('Failed to fetch submissions:', submissionsError);
    return { ok: false as const, error: 'Failed to fetch submissions' };
  }

  return { ok: true as const, submissions: submissions || [] };
}

async function fetchFormTitleMap(
  supabase: ReturnType<typeof getServiceClient>,
  formIds: Set<string>
): Promise<Map<string, string>> {
  const titleMap = new Map<string, string>();
  if (formIds.size === 0) return titleMap;

  const db = supabase as unknown as PeskidsClient;
  const { data: rawForms } = await db.from('peskids.forms').select('id, title').in('id', Array.from(formIds));
  type FormRow = { id: string; title: string };
  const forms = rawForms as FormRow[] | null;

  forms?.forEach((form) => {
    titleMap.set(form.id, form.title);
  });

  return titleMap;
}

function mapSubmissionToStudentSubmission(
  sub: SubmissionRow,
  formTitleMap: Map<string, string>
): StudentSubmission {
  const submissionStatus = mapStatusToSubmissionStatus(
    sub.status,
    Boolean(sub.score),
    Boolean(sub.feedback)
  );

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
        const statusParam = request.nextUrl.searchParams.get('status') || 'pending';

        if (!tenantSlug) {
          return jsonError('Missing tenant slug', HTTP_STATUS.BAD_REQUEST);
        }

        const supabase = getServiceClient();
    const submissionsResult = await buildSubmissionsQuery(supabase, tenantSlug, statusParam);
    if (!submissionsResult.ok) {
      return jsonError(submissionsResult.error, HTTP_STATUS.INTERNAL_ERROR);
    }

    const formIds = new Set<string>();
    submissionsResult.submissions.forEach((sub) => {
      if (sub.form_id) formIds.add(sub.form_id);
    });

    const formTitleMap = await fetchFormTitleMap(supabase, formIds);

    const studentSubmissions: StudentSubmission[] = submissionsResult.submissions.map((sub) =>
      mapSubmissionToStudentSubmission(sub as SubmissionRow, formTitleMap)
    );

    return jsonOk({ submissions: studentSubmissions });
  } catch (error) {
    console.error('Teacher submissions endpoint error:', error);
    return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
    },
    PORTAL_READ_ACCESS
  );
}
