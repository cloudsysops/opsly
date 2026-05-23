import { createClient } from '@supabase/supabase-js';

export interface SubmissionExportOptions {
  format: 'csv' | 'json';
  fields?: string[]; // specific fields to include
  includeMetadata?: boolean;
}

export interface BulkGradeRequest {
  submissionIds: string[];
  score: number;
  feedback?: string;
  status: 'graded' | 'reviewed';
}

export class SubmissionOperations {
  private supabase: any;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    }) as any;
  }

  /**
   * Export form submissions to CSV or JSON format
   */
  async exportSubmissions(
    formId: string,
    tenantSlug: string,
    options: SubmissionExportOptions
  ): Promise<string> {
    const { data: submissions, error } = await this.supabase
      .from('peskids.form_submissions')
      .select('*')
      .eq('form_id', formId)
      .eq('tenant_slug', tenantSlug)
      .order('completed_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch submissions: ${error.message}`);
    }

    if (options.format === 'json') {
      return JSON.stringify(submissions, null, 2);
    }

    // CSV format
    return this.convertToCSV(submissions, options.fields, options.includeMetadata);
  }

  /**
   * Bulk update submission grades and status
   */
  async bulkGradeSubmissions(request: BulkGradeRequest, tenantSlug: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('peskids.form_submissions')
      .update({
        score: request.score,
        feedback: request.feedback || null,
        status: request.status,
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_slug', tenantSlug)
      .in('submission_id', request.submissionIds)
      .select('id');

    if (error) {
      throw new Error(`Failed to grade submissions: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Update individual submission grade
   */
  async gradeSubmission(
    submissionId: string,
    tenantSlug: string,
    score: number,
    feedback?: string
  ): Promise<void> {
    const { error } = await this.supabase
      .from('peskids.form_submissions')
      .update({
        score,
        feedback: feedback || null,
        status: 'graded',
        updated_at: new Date().toISOString(),
      })
      .eq('submission_id', submissionId)
      .eq('tenant_slug', tenantSlug);

    if (error) {
      throw new Error(`Failed to grade submission: ${error.message}`);
    }
  }

  /**
   * Get submission statistics for a form
   */
  async getSubmissionStats(
    formId: string,
    tenantSlug: string
  ): Promise<{
    total: number;
    graded: number;
    reviewed: number;
    pending: number;
    averageScore?: number;
  }> {
    const { data: submissions, error } = await this.supabase
      .from('peskids.form_submissions')
      .select('status, score')
      .eq('form_id', formId)
      .eq('tenant_slug', tenantSlug);

    if (error) {
      throw new Error(`Failed to fetch submissions: ${error.message}`);
    }

    const submissionList = (submissions ?? []) as Array<{
      status: 'graded' | 'reviewed' | 'pending_review' | string;
      score?: number | null;
    }>;

    const stats: {
      total: number;
      graded: number;
      reviewed: number;
      pending: number;
      averageScore?: number;
    } = {
      total: submissionList.length || 0,
      graded: submissionList.filter((s) => s.status === 'graded').length || 0,
      reviewed: submissionList.filter((s) => s.status === 'reviewed').length || 0,
      pending: submissionList.filter((s) => s.status === 'pending_review').length || 0,
    };

    const gradedScores = submissionList
      .map((s) => s.score)
      .filter((score): score is number => typeof score === 'number');

    if (gradedScores.length > 0) {
      stats.averageScore = gradedScores.reduce((a, b) => a + b, 0) / gradedScores.length;
    }

    return stats;
  }

  /**
   * Delete submissions (with audit logging)
   */
  async deleteSubmissions(
    submissionIds: string[],
    tenantSlug: string,
    reason?: string
  ): Promise<number> {
    // First, log deletion in audit table
    for (const submissionId of submissionIds) {
      await this.supabase.rpc('log_audit_event', {
        p_action: 'form_submission_deleted',
        p_actor_id: 'system',
        p_tenant_slug: tenantSlug,
        p_resource_id: submissionId,
        p_resource_type: 'form_submission',
        p_metadata: { reason: reason || 'bulk delete' },
      });
    }

    // Then delete
    const { data, error } = await this.supabase
      .from('peskids.form_submissions')
      .delete()
      .eq('tenant_slug', tenantSlug)
      .in('submission_id', submissionIds)
      .select('id');

    if (error) {
      throw new Error(`Failed to delete submissions: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Convert submissions array to CSV string
   */
  private convertToCSV(
    submissions: any[],
    fields?: string[],
    includeMetadata?: boolean
  ): string {
    if (!submissions || submissions.length === 0) {
      return 'No submissions to export';
    }

    // Determine columns
    let columns: string[] = fields || [];
    if (!columns.length) {
      // Use keys from first submission data
      const firstData = submissions[0]?.submission_data || {};
      columns = Object.keys(firstData);
    }

    if (includeMetadata) {
      columns.unshift('submission_id', 'completed_at', 'status', 'score', 'feedback');
    }

    // Build CSV header
    const header = columns.map((col) => `"${col}"`).join(',');

    // Build CSV rows
    const rows = submissions.map((sub) => {
      return columns
        .map((col) => {
          let value: any;

          if (includeMetadata && ['submission_id', 'completed_at', 'status', 'score', 'feedback'].includes(col)) {
            value = sub[col];
          } else {
            value = sub.submission_data?.[col];
          }

          // Escape quotes and wrap in quotes if needed
          if (value === null || value === undefined) {
            return '""';
          }
          const stringValue = String(value).replace(/"/g, '""');
          return `"${stringValue}"`;
        })
        .join(',');
    });

    return [header, ...rows].join('\n');
  }
}
