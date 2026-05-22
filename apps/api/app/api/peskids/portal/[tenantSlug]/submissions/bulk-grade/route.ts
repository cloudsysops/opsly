import type { NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jsonError, jsonOk } from '../../../../../../../../lib/api-response';
import { HTTP_STATUS } from '../../../../../../../../lib/constants';

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

interface BulkGradeRequest {
  submissionIds: string[];
  score: number;
  feedback?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { tenantSlug: string } }
): Promise<Response> {
  try {
    const tenantSlug = params.tenantSlug;

    if (!tenantSlug) {
      return jsonError('Missing tenant slug', HTTP_STATUS.BAD_REQUEST);
    }

    const body = (await request.json()) as Partial<BulkGradeRequest>;

    if (!body.submissionIds || !Array.isArray(body.submissionIds) || body.submissionIds.length === 0) {
      return jsonError('submissionIds array is required and must not be empty', HTTP_STATUS.BAD_REQUEST);
    }

    if (body.score === undefined || typeof body.score !== 'number' || body.score < 0 || body.score > 100) {
      return jsonError('Score must be a number between 0 and 100', HTTP_STATUS.BAD_REQUEST);
    }

    const supabase = getSupabaseClient();

    // Update submissions
    const { data: updated, error: updateError } = await supabase
      .from('peskids.form_submissions')
      .update({
        score: body.score,
        feedback: body.feedback || null,
        status: 'graded',
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_slug', tenantSlug)
      .in('submission_id', body.submissionIds)
      .select('submission_id');

    if (updateError) {
      console.error('Failed to grade submissions:', updateError);
      return jsonError('Failed to grade submissions', HTTP_STATUS.INTERNAL_ERROR);
    }

    // Log audit event
    try {
      await supabase.rpc('log_audit_event', {
        p_action: 'form_submissions_bulk_graded',
        p_actor_id: 'teacher', // Would be actual user ID in real app
        p_tenant_slug: tenantSlug,
        p_resource_id: 'bulk',
        p_resource_type: 'form_submission',
        p_metadata: {
          count: updated?.length || 0,
          score: body.score,
        },
      });
    } catch (auditError) {
      console.error('Failed to log audit event:', auditError);
    }

    return jsonOk({
      updated: updated?.length || 0,
      submissionIds: updated?.map((u) => u.submission_id) || [],
    });
  } catch (error) {
    console.error('Bulk grade error:', error);
    return jsonError('Internal server error', HTTP_STATUS.INTERNAL_ERROR);
  }
}
