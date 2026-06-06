import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api-response';
import { HTTP_STATUS } from '@/lib/constants';
import { runTrustedPortalDalForPathSlug } from '@/lib/portal-tenant-dal';
import { getServiceClient } from '@/lib/supabase';

// peskids.* tables pending DB type codegen
interface PeskidsQB {
  update(data: Record<string, unknown>): PeskidsQB;
  eq(col: string, val: unknown): PeskidsQB;
  in(col: string, vals: unknown[]): PeskidsQB;
  select(cols: string): Promise<{ data: unknown[] | null; error: unknown }>;
}
interface PeskidsClient {
  from(table: string): PeskidsQB;
  rpc(fn: string, params: Record<string, unknown>): Promise<{ data: unknown; error: unknown }>;
}

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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
): Promise<Response> {
  const { tenantSlug } = await params;

  return runTrustedPortalDalForPathSlug(request, tenantSlug, async (session) => {
    try {
      if (!tenantSlug) {
        return jsonError('Missing tenant slug', HTTP_STATUS.BAD_REQUEST);
      }

      const body = (await request.json()) as Partial<BulkGradeRequest>;

      const validation = validateBulkGradeRequest(body);
      if (!validation.valid) {
        return validation.error;
      }

      const supabase = getServiceClient();

      const db = supabase as unknown as PeskidsClient;
      const { data: rawUpdated, error: updateError } = await db
        .from('peskids.form_submissions')
        .update({
          score: validation.request.score,
          feedback: validation.request.feedback || null,
          status: 'graded',
          updated_at: new Date().toISOString(),
        })
        .eq('tenant_slug', tenantSlug)
        .in('submission_id', validation.request.submissionIds)
        .select('submission_id');

      type UpdatedRow = { submission_id: string };
      const updated = rawUpdated as UpdatedRow[] | null;

      if (updateError) {
        console.error('Failed to grade submissions:', updateError);
        return jsonError('Failed to grade submissions', HTTP_STATUS.INTERNAL_ERROR);
      }

      try {
        await db.rpc('log_audit_event', {
          p_action: 'form_submissions_bulk_graded',
          p_actor_id: session.user.id,
          p_tenant_slug: tenantSlug,
          p_resource_id: 'bulk',
          p_resource_type: 'form_submission',
          p_metadata: {
            count: updated?.length || 0,
            score: validation.request.score,
          },
        });
      } catch (auditError) {
        console.error('Failed to log audit event:', auditError);
      }

      return jsonOk({
        updated: (updated || []).length,
        submissionIds: (updated || []).map((u) => u.submission_id),
      });
    } catch (error) {
      console.error('Bulk grade error:', error);
      return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
    }
  });
}
