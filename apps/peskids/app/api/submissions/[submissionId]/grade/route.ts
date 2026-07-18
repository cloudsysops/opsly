import { type NextRequest, NextResponse } from 'next/server';
import { validateStaffRequest } from '@/lib/staff-auth';
import { tenantRoleFromUserMetadata } from '@/lib/runtime/tenant-identity';
import { supabaseServer } from '@/lib/supabase';
import { gradeSubmissionSchema } from '@/lib/validation/submission.schema';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

type RouteContext = { params: Promise<{ submissionId: string }> };

export async function POST(req: NextRequest, context: RouteContext): Promise<NextResponse> {
  const requestId = resolveRequestId(req);
  try {
    const auth = await validateStaffRequest(req);
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }

    const role = auth.user ? tenantRoleFromUserMetadata(auth.user) : null;
    if (auth.method !== 'secret' && role !== 'teacher' && role !== 'admin') {
      return errorJson(requestId, 'Forbidden', 403);
    }

    const { submissionId } = await context.params;

    const raw = await req.json();
    const parsed = gradeSubmissionSchema.safeParse(raw);
    if (!parsed.success) {
      return errorJson(requestId, parsed.error.issues[0]?.message ?? 'Invalid input', 400);
    }

    const tenantSlug = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';
    const supabase = supabaseServer().schema('peskids');

    const { data, error } = await supabase
      .from('form_submissions')
      .update({
        score: parsed.data.score,
        feedback: parsed.data.feedback ?? null,
        status: 'graded',
        updated_at: new Date().toISOString(),
      })
      .eq('tenant_slug', tenantSlug)
      .eq('submission_id', submissionId)
      .select('submission_id, score, feedback, status');

    if (error) {
      console.error('Failed to grade submission:', error, { request_id: requestId });
      return errorJson(requestId, 'Failed to grade submission', 500);
    }

    const graded = data?.[0];
    if (!graded) {
      return errorJson(requestId, 'Submission not found', 404);
    }

    return successJson(requestId, {
      submissionId: graded.submission_id,
      score: graded.score,
      feedback: graded.feedback,
      status: graded.status,
    });
  } catch (error) {
    console.error('Grade submission error:', error, { request_id: requestId });
    return errorJson(requestId, 'Internal server error', 500);
  }
}
