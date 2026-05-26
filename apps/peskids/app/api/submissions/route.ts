import { NextResponse } from 'next/server';
import { createFormSubmissionService } from '@/lib/services/form-submission.service';

export async function GET(): Promise<NextResponse> {
  try {
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';
    const userRole = 'parent';

    const service = createFormSubmissionService();
    const submissions = await service.getParentSubmissions();

    return NextResponse.json({
      submissions,
      count: submissions.length,
      tenantId,
      userRole,
    });
  } catch (error) {
    console.error('Submissions API error:', error);
    return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 });
  }
}
