import { NextRequest, NextResponse } from 'next/server'
import { tenantRoleFromUserMetadata } from '../../../../../../lib/runtime/src/tenant-identity'
import { validateStaffRequest } from '@/lib/staff-auth'
import { createFormSubmissionService } from '@/lib/services/form-submission.service'

const TEACHER_VISIBLE_ROLES = new Set(['teacher', 'admin', 'owner'])

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallback: T): Promise<T> {
  return new Promise<T>((resolve) => {
    const timeout = setTimeout(() => resolve(fallback), timeoutMs)

    void promise
      .then((value) => {
        clearTimeout(timeout)
        resolve(value)
      })
      .catch((error: unknown) => {
        clearTimeout(timeout)
        console.error('Teacher submissions timeout or failure:', error)
        resolve(fallback)
      })
  })
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await validateStaffRequest(req)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    if (auth.method !== 'secret' && auth.user) {
      const role = tenantRoleFromUserMetadata(auth.user)
      if (!role || !TEACHER_VISIBLE_ROLES.has(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'

    const service = createFormSubmissionService()
    const submissions = await withTimeout<Awaited<ReturnType<typeof service.getTeacherSubmissions>>>(
      service.getTeacherSubmissions(),
      5000,
      []
    )

    const reviewedCount = submissions.filter((s) => s.status === 'reviewed').length
    const pendingCount = submissions.filter((s) => s.status === 'pending').length
    const needsRevisionCount = submissions.filter((s) => s.status === 'needs_revision').length
    const uniqueStudents = new Set(submissions.map((s) => s.studentId)).size

    return NextResponse.json({
      submissions,
      stats: {
        reviewedCount,
        pendingCount,
        needsRevisionCount,
        uniqueStudents,
      },
      tenantId,
    })
  } catch (error) {
    console.error('Teacher submissions API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teacher submissions' },
      { status: 500 }
    )
  }
}
