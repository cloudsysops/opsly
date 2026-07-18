import { type NextRequest, NextResponse } from 'next/server';
import { validateStaffRequest } from '@/lib/staff-auth';
import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { fireSubmissionEvent } from '@/lib/n8n-submission-events';

type FormSubmissionUpdate = Database['peskids']['Tables']['form_submissions']['Update'];

interface BulkActionRequest {
  submissionIds: string[];
  action: 'mark_reviewed' | 'send_observations' | 'reassign';
  feedback?: string;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = resolveRequestId(req);
  try {
    const auth = await validateStaffRequest(req);
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }

    const body = (await req.json()) as Partial<BulkActionRequest>;

    if (
      !body.submissionIds ||
      !Array.isArray(body.submissionIds) ||
      body.submissionIds.length === 0
    ) {
      return errorJson(requestId, 'submissionIds array is required and must not be empty', 400);
    }

    if (!body.action || !['mark_reviewed', 'send_observations', 'reassign'].includes(body.action)) {
      return errorJson(
        requestId,
        'action must be one of: mark_reviewed, send_observations, reassign',
        400
      );
    }

    const supabase = supabaseServer().schema('peskids');
    const tenantSlug = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';

    const updatePayload: FormSubmissionUpdate = { updated_at: new Date().toISOString() };

    switch (body.action) {
      case 'mark_reviewed':
        updatePayload.status = 'reviewed';
        break;
      case 'send_observations':
        updatePayload.feedback = body.feedback || 'Se enviaron observaciones generales.';
        break;
      case 'reassign':
        // 'submitted' is the only pre-graded status in the CHECK constraint
        // (peskids.form_submissions.status IN ('started','submitted','reviewed','graded'));
        // 'pending' would violate it.
        updatePayload.status = 'submitted';
        updatePayload.score = null;
        updatePayload.feedback = null;
        break;
    }

    const { data: updated, error: updateError } = await supabase
      .from('form_submissions')
      .update(updatePayload)
      .eq('tenant_slug', tenantSlug)
      .in('submission_id', body.submissionIds)
      .select('submission_id');

    if (updateError) {
      console.error('Bulk action failed:', updateError);
      return errorJson(requestId, 'Failed to perform bulk action', 500);
    }

    try {
      await supabase.rpc('log_audit_event', {
        p_action: `form_submissions_bulk_${body.action}`,
        p_actor_id: auth.user?.id || 'staff',
        p_tenant_slug: tenantSlug,
        p_resource_id: 'bulk',
        p_resource_type: 'form_submission',
        p_metadata: {
          count: updated?.length || 0,
          action: body.action,
        },
      });
    } catch {
      // audit log is non-critical
    }

    const response = successJson(requestId, {
      updated: updated?.length || 0,
      submissionIds: updated?.map((u: { submission_id: string }) => u.submission_id) || [],
      action: body.action,
    });

    void fireSubmissionEvent(
      body.action,
      (updated ?? []).map((u: { submission_id: string }) => ({
        submission_id: u.submission_id,
        feedback:
          body.action === 'send_observations'
            ? (updatePayload.feedback as string | undefined)
            : undefined,
      })),
      auth.user?.id
    );

    return response;
  } catch (error) {
    console.error('Bulk action error:', error);
    return errorJson(requestId, 'Internal server error', 500);
  }
}
