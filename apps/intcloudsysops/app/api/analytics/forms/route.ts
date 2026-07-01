import { type NextRequest, NextResponse } from 'next/server';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';
import { validateStaffRequest } from '@/lib/staff-auth';
import { createFormSubmissionService } from '@/lib/services/form-submission.service';

export async function GET(_req: NextRequest): Promise<NextResponse> {
  const requestId = resolveRequestId(_req);

  try {
    const auth = await validateStaffRequest(_req);
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';

    const service = createFormSubmissionService();
    const metrics = await service.getFormAnalytics();
    const totalSubmissions = metrics.reduce((sum, form) => sum + form.submissionsCount, 0);

    return successJson(
      requestId,
      {
        metrics,
        summary: {
          totalForms: metrics.length,
          totalSubmissions,
          tenantId,
        },
      }
    );
  } catch (error) {
    console.error('Form analytics API error:', error, { request_id: requestId });
    return errorJson(requestId, 'Failed to fetch form analytics', 500);
  }
}
