import { type NextRequest, NextResponse } from 'next/server';
import { validateFamilyRequest } from '@/lib/family-auth';
import { createFormSubmissionService } from '@/lib/services/form-submission.service';
import { supabaseServer } from '@/lib/supabase';
import { syncSubmissionToTwenty } from '@/lib/twenty-submission-sync';
import type { Json } from '@/lib/types';
import { createSubmissionSchema } from '@/lib/validation/submission.schema';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const requestId = resolveRequestId(_req);
  try {
    const auth = await validateFamilyRequest(_req);
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';
    const userRole = 'parent';
    const parentEmail = auth.user.email?.trim() ?? '';

    const service = createFormSubmissionService();
    const submissions = await service.getParentSubmissions(parentEmail);

    return successJson(requestId, {
      submissions,
      count: submissions.length,
      tenantId,
      userRole,
    });
  } catch (error) {
    console.error('Submissions API error:', error, { request_id: requestId });
    return errorJson(requestId, 'Failed to fetch submissions', 500);
  }
}

function extractParentNameFromFormData(data: Record<string, unknown>): string | undefined {
  const candidate = data.parent_name ?? data.parentName ?? data.name;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : undefined;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const requestId = resolveRequestId(req);
  try {
    const auth = await validateFamilyRequest(req);
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }

    const raw = await req.json();
    const parsed = createSubmissionSchema.safeParse(raw);
    if (!parsed.success) {
      return errorJson(requestId, parsed.error.issues[0]?.message ?? 'Invalid input', 400);
    }

    const tenantSlug = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';
    const supabase = supabaseServer().schema('peskids');

    const { data: form, error: formError } = await supabase
      .from('forms')
      .select('id, status')
      .eq('tenant_slug', tenantSlug)
      .eq('form_id', parsed.data.formId)
      .maybeSingle();

    if (formError) {
      console.error('Failed to look up form:', formError, { request_id: requestId });
      return errorJson(requestId, 'Failed to create submission', 500);
    }
    if (!form || form.status !== 'active') {
      return errorJson(requestId, 'Form not found', 404);
    }

    const parentEmail = auth.user.email?.trim().toLowerCase() ?? '';
    const formData: Record<string, unknown> = {
      ...parsed.data.data,
      ...(parentEmail && !('parent_email' in parsed.data.data)
        ? { parent_email: parentEmail }
        : {}),
    };

    const { data: submission, error: insertError } = await supabase
      .from('form_submissions')
      .insert({
        submission_id: crypto.randomUUID(),
        tenant_slug: tenantSlug,
        form_id: form.id,
        user_id: auth.user.id,
        form_data: formData as Json,
        status: 'submitted',
        completed_at: new Date().toISOString(),
      })
      .select('id, submission_id, status, completed_at')
      .single();

    if (insertError || !submission) {
      console.error('Failed to create submission:', insertError, { request_id: requestId });
      return errorJson(requestId, 'Failed to create submission', 500);
    }

    if (parentEmail) {
      void syncSubmissionToTwenty({
        parentEmail,
        parentName: extractParentNameFromFormData(formData),
      })
        .then(async (result) => {
          if (!result) return;
          const { error: twentyUpdateError } = await supabase
            .from('form_submissions')
            .update({
              twenty_person_id: result.twentyPersonId,
              twenty_synced_at: new Date().toISOString(),
            })
            .eq('id', submission.id);
          if (twentyUpdateError) {
            console.error('Failed to store twenty_person_id on submission:', twentyUpdateError, {
              request_id: requestId,
            });
          }
        })
        .catch((err: unknown) => {
          console.error('Twenty sync failed for submission:', err, { request_id: requestId });
        });
    }

    return successJson(
      requestId,
      {
        id: submission.id,
        submissionId: submission.submission_id,
        formId: parsed.data.formId,
        status: submission.status,
        completedAt: submission.completed_at,
      },
      201
    );
  } catch (error) {
    console.error('Submission creation error:', error, { request_id: requestId });
    return errorJson(requestId, 'Internal server error', 500);
  }
}
