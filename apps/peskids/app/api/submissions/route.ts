import { type NextRequest, NextResponse } from 'next/server';
import { validateFamilyRequest } from '@/lib/family-auth';
import { createFormSubmissionService } from '@/lib/services/form-submission.service';
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
