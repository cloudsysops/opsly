import { supabaseServer } from '@/lib/supabase';

function peskidsClient() {
  return supabaseServer().schema('peskids');
}

interface FormSubmissionFormData {
  student_name?: string;
  child_name?: string;
  name?: string;
  parent_email?: string;
  family_email?: string;
  email?: string;
  guardian_email?: string;
  grade_interested?: string;
  gradeInterested?: string;
  grade_or_level?: string;
  level?: string;
}

interface ParentSubmissionRow {
  submission_id: string;
  completed_at: string | null;
  status: 'started' | 'submitted' | 'reviewed' | 'graded';
  form_data: FormSubmissionFormData | null;
  form_id: string;
  form: { title: string } | null;
}

interface TeacherSubmissionRow {
  submission_id: string;
  user_id: string | null;
  form_data: FormSubmissionFormData | null;
  score: number | null;
  feedback: string | null;
  status: 'started' | 'submitted' | 'reviewed' | 'graded';
  completed_at: string | null;
  form: { title: string } | null;
}

interface FormAnalyticsFormRow {
  id: string;
  title: string;
}

interface FormAnalyticsSubmissionRow {
  form_id: string;
  status: 'started' | 'submitted' | 'reviewed' | 'graded';
  started_at: string | null;
  completed_at: string | null;
}

function extractParentEmail(formData: FormSubmissionFormData | null): string {
  return (
    formData?.parent_email ||
    formData?.family_email ||
    formData?.email ||
    formData?.guardian_email ||
    ''
  )
    .toString()
    .trim()
    .toLowerCase();
}

export interface FormSubmissionSummary {
  formId: string;
  formTitle: string;
  submissionId: string;
  submittedAt: string;
  status: 'completed' | 'pending' | 'reviewed';
  studentName?: string;
}

export interface StudentSubmission {
  submissionId: string;
  studentName: string;
  studentId: string;
  formTitle: string;
  submittedAt: string;
  parentEmail?: string | null;
  grade?: number | null;
  maxGrade: number;
  feedback?: string | null;
  status: 'reviewed' | 'pending' | 'needs_revision';
  studentLevel?: string;
  progressPercent?: number;
}

export class FormSubmissionService {
  private tenantSlug = 'peskids';

  async getParentSubmissions(parentEmail?: string): Promise<FormSubmissionSummary[]> {
    const normalizedParentEmail = parentEmail?.trim().toLowerCase() ?? '';
    if (!normalizedParentEmail) return [];

    const query = peskidsClient()
      .from('form_submissions')
      .select(
        `
        submission_id,
        completed_at,
        status,
        form_data,
        form_id,
        form:form_id(title)
      `
      )
      .eq('tenant_slug', this.tenantSlug)
      .not('user_id', 'is', null)
      .order('completed_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Failed to fetch parent submissions:', error);
      return [];
    }

    const rows = (data || []) as unknown as ParentSubmissionRow[];

    return rows
      .filter((row) => extractParentEmail(row.form_data) === normalizedParentEmail)
      .map((row) => ({
        formId: row.form_id,
        formTitle: row.form?.title || 'Untitled Form',
        submissionId: row.submission_id,
        submittedAt: row.completed_at || new Date().toISOString(),
        status:
          row.status === 'graded'
            ? 'reviewed'
            : row.status === 'submitted'
              ? 'completed'
              : 'pending',
        studentName:
          row.form_data?.student_name ||
          row.form_data?.child_name ||
          row.form_data?.name ||
          undefined,
      }));
  }

  async getTeacherSubmissions(): Promise<StudentSubmission[]> {
    const { data, error } = await peskidsClient()
      .from('form_submissions')
      .select(
        `
        submission_id,
        user_id,
        form_data,
        score,
        feedback,
        status,
        completed_at,
        form:form_id(title)
      `
      )
      .eq('tenant_slug', this.tenantSlug)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch teacher submissions:', error);
      return [];
    }

    const rows = (data || []) as unknown as TeacherSubmissionRow[];

    return rows.map((row) => ({
      submissionId: row.submission_id,
      studentName: row.form_data?.student_name || 'Unknown Student',
      studentId: row.user_id || row.submission_id,
      formTitle: row.form?.title || 'Untitled Form',
      submittedAt: row.completed_at || new Date().toISOString(),
      parentEmail: extractParentEmail(row.form_data) || null,
      grade: row.score,
      maxGrade: 100,
      feedback: row.feedback,
      status:
        row.status === 'graded'
          ? 'reviewed'
          : row.status === 'submitted'
            ? 'pending'
            : 'needs_revision',
      studentLevel:
        row.form_data?.grade_interested ||
        row.form_data?.gradeInterested ||
        row.form_data?.grade_or_level ||
        row.form_data?.level ||
        undefined,
      progressPercent:
        typeof row.score === 'number'
          ? Math.max(0, Math.min(100, Math.round((row.score / 100) * 100)))
          : row.status === 'graded'
            ? 100
            : row.status === 'submitted'
              ? 70
              : 45,
    }));
  }

  async getFormAnalytics(): Promise<
    {
      formId: string;
      formTitle: string;
      submissionsCount: number;
      abandonmentRate: number;
      avgCompletionTime: number;
      errorCount: number;
    }[]
  > {
    const client = peskidsClient();
    const { data: forms, error: formsError } = await client
      .from('forms')
      .select('id, title')
      .eq('tenant_slug', this.tenantSlug);

    if (formsError) {
      console.error('Failed to fetch forms:', formsError);
      return [];
    }

    const { data: submissions, error: submissionsError } = await client
      .from('form_submissions')
      .select('form_id, status, started_at, completed_at')
      .eq('tenant_slug', this.tenantSlug);

    if (submissionsError) {
      console.error('Failed to fetch submissions:', submissionsError);
      return [];
    }

    const formRows = (forms || []) as FormAnalyticsFormRow[];
    const submissionRows = (submissions || []) as FormAnalyticsSubmissionRow[];

    return formRows.map((form) => {
      const formSubmissions = submissionRows.filter((s) => s.form_id === form.id);
      const completed = formSubmissions.filter(
        (s) => s.status === 'submitted' || s.status === 'graded'
      );
      const started = formSubmissions.filter((s) => s.status === 'started');

      const completionTimes = completed
        .filter((s) => s.started_at && s.completed_at)
        .map((s) => {
          const start = new Date(s.started_at as string).getTime();
          const end = new Date(s.completed_at as string).getTime();
          return (end - start) / 1000 / 60; // minutes
        });

      const avgCompletionTime =
        completionTimes.length > 0
          ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
          : 0;
      const abandonmentRate =
        started.length > 0
          ? Math.round((started.length / (started.length + completed.length)) * 100)
          : 0;

      return {
        formId: form.id,
        formTitle: form.title,
        submissionsCount: completed.length,
        abandonmentRate,
        avgCompletionTime,
        errorCount: 0, // TODO: track validation errors
      };
    });
  }
}

export const createFormSubmissionService = () => new FormSubmissionService();
