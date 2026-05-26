import { type NextRequest, NextResponse } from 'next/server';
import { createFormSubmissionService } from '@/lib/services/form-submission.service';

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';

    const service = createFormSubmissionService();
    const metrics = await service.getFormAnalytics();
    const totalSubmissions = metrics.reduce((sum, form) => sum + form.submissionsCount, 0);

    return NextResponse.json({
      metrics,
      summary: {
        totalForms: metrics.length,
        totalSubmissions,
        tenantId,
      },
    });
  } catch (error) {
    console.error('Form analytics API error:', error);
    return NextResponse.json({ error: 'Failed to fetch form analytics' }, { status: 500 });
  }
}
