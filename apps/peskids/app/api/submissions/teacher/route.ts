import { type NextRequest, NextResponse } from 'next/server';
import { validateStaffRequest } from '@/lib/staff-auth';
import { tenantRoleFromUserMetadata } from '@/lib/runtime/tenant-identity';
import { createFormSubmissionService } from '@/lib/services/form-submission.service';
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response';

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
  const requestId = resolveRequestId(_req);
  try {
    const auth = await validateStaffRequest(_req);
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status);
    }
    const role = auth.user ? tenantRoleFromUserMetadata(auth.user) : null;
    if (auth.method !== 'secret' && role !== 'teacher' && role !== 'admin') {
      return errorJson(requestId, 'Forbidden', 403);
    }

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';

    const service = createFormSubmissionService();
    const submissions = await withTimeout<
      Awaited<ReturnType<typeof service.getTeacherSubmissions>>
    >(service.getTeacherSubmissions(), 5000, []);

    const reviewedCount = submissions.filter((s) => s.status === 'reviewed').length;
    const pendingCount = submissions.filter((s) => s.status === 'pending').length;
    const needsRevisionCount = submissions.filter((s) => s.status === 'needs_revision').length;
    const uniqueStudents = new Set(submissions.map((s) => s.studentId)).size;

    return successJson(requestId, {
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
    console.error('Teacher submissions API error:', error, { request_id: requestId });
    return errorJson(requestId, 'Failed to fetch teacher submissions', 500);
  }
}
