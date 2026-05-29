import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api-response';
import { HTTP_STATUS } from '@/lib/constants';
import { runTrustedPortalDalForPathSlug } from '@/lib/portal-tenant-dal';
import { getServiceClient } from '@/lib/supabase';

interface BulkGradeRequest {
  submissionIds: string[];
  score: number;
  feedback?: string;
}

function validateSubmissionIds(submissionIds: unknown): submissionIds is string[] {
  return Array.isArray(submissionIds) && submissionIds.length > 0;
}

function validateScore(score: unknown): score is number {
  return score !== undefined && typeof score === 'number' && score >= 0 && score <= 100;
}

function validateBulkGradeRequest(
  body: Partial<BulkGradeRequest>
): { valid: true; request: BulkGradeRequest } | { valid: false; error: Response } {
  if (!validateSubmissionIds(body.submissionIds)) {
    return {
      valid: false,
      error: jsonError(
        'submissionIds array is required and must not be empty',
        HTTP_STATUS.BAD_REQUEST
      ),
    };
  }

  if (!validateScore(body.score)) {
    return {
      valid: false,
      error: jsonError('Score must be a number between 0 and 100', HTTP_STATUS.BAD_REQUEST),
    };
  }

  return {
    valid: true,
    request: {
      submissionIds: body.submissionIds,
      score: body.score,
      feedback: body.feedback,
    },
  };
}

async function gradeSubmissionsAndAudit(
  supabase: ReturnType<typeof getSupabaseClient>,
  tenantSlug: string,
  submissionIds: string[],
  score: number,
  feedback: string | undefined
) {
  const { data: updated, error: updateError } = await supabase
    .from('peskids.form_submissions')
    .update({
      score,
      feedback: feedback || null,
      status: 'graded',
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_slug', tenantSlug)
    .in('submission_id', submissionIds)
    .select('submission_id');

  if (updateError) {
    console.error('Failed to grade submissions:', updateError);
    return { ok: false as const, error: 'Failed to grade submissions' };
  }

  try {
    await supabase.rpc('log_audit_event', {
      p_action: 'form_submissions_bulk_graded',
      p_actor_id: 'teacher',
      p_tenant_slug: tenantSlug,
      p_resource_id: 'bulk',
      p_resource_type: 'form_submission',
      p_metadata: {
        count: updated?.length || 0,
        score,
      },
    });
  } catch (auditError) {
    console.error('Failed to log audit event:', auditError);
  }

  return {
    ok: true as const,
    updated: updated || [],
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
): Promise<Response> {
  const { tenantSlug } = await params;

    if (!tenantSlug) {
      return jsonError('Missing tenant slug', HTTP_STATUS.BAD_REQUEST);
    }

    const body = (await request.json()) as Partial<BulkGradeRequest>;

    const validation = validateBulkGradeRequest(body);
    if (!validation.valid) {
      return validation.error;
    }

    const supabase = getSupabaseClient();

    const result = await gradeSubmissionsAndAudit(
      supabase,
      tenantSlug,
      validation.request.submissionIds,
      validation.request.score,
      validation.request.feedback
    );

    if (!result.ok) {
      return jsonError(result.error, HTTP_STATUS.INTERNAL_ERROR);
    }

    return jsonOk({
      updated: result.updated.length,
      submissionIds: result.updated.map((u) => u.submission_id),
    });
  } catch (error) {
    console.error('Bulk grade error:', error);
    return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
}
