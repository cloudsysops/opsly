import { NextResponse } from 'next/server'
import { createFormSubmissionService } from '@/lib/services/form-submission.service'

export async function GET(): Promise<NextResponse> {
  try {
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'

    const service = createFormSubmissionService()
    const submissions = await service.getTeacherSubmissions()

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
