import { type NextRequest, NextResponse } from 'next/server';
import { createFormSubmissionService } from '@/lib/services/form-submission.service';

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timeout = setTimeout(() => resolve(fallback), timeoutMs);

    void promise
      .then((value) => {
        clearTimeout(timeout);
        resolve(value);
      })
      .catch((error: unknown) => {
        clearTimeout(timeout);
        console.error('Teacher submissions timeout or failure:', error);
        resolve(fallback);
      });
  });
}

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';

    const service = createFormSubmissionService();
    const submissions = await withTimeout<
      Awaited<ReturnType<typeof service.getTeacherSubmissions>>
    >(service.getTeacherSubmissions(), 5000, []);

    const reviewedCount = submissions.filter((s) => s.status === 'reviewed').length;
    const pendingCount = submissions.filter((s) => s.status === 'pending').length;
    const needsRevisionCount = submissions.filter((s) => s.status === 'needs_revision').length;
    const uniqueStudents = new Set(submissions.map((s) => s.studentId)).size;

    return NextResponse.json({
      submissions,
      stats: {
        reviewedCount,
        pendingCount,
        needsRevisionCount,
        uniqueStudents,
      },
      tenantId,
    });
  } catch (error) {
    console.error('Teacher submissions API error:', error);
    return NextResponse.json({ error: 'Failed to fetch teacher submissions' }, { status: 500 });
  }
}
