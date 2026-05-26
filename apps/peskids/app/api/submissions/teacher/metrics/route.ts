import { NextRequest, NextResponse } from 'next/server'
import { loadPeskidsBiSnapshot } from '../../../../../lib/bi-snapshot'
import { validateStaffRequest } from '@/lib/staff-auth'
import { isStaffUser } from '@/lib/staff-user'
import { createFormSubmissionService } from '@/lib/services/form-submission.service'
import { buildTeacherRoleMetrics } from '@/lib/role-metrics'

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await validateStaffRequest(req)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    if (auth.method !== 'secret' && auth.user && !isStaffUser(auth.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const snapshot = await loadPeskidsBiSnapshot()
    if (snapshot?.teacher) {
      return NextResponse.json({
        metrics: snapshot.teacher,
        summary: {
          totalSubmissions: snapshot.teacher.totalSubmissions,
          uniqueStudents: snapshot.teacher.uniqueStudents,
        },
      })
    }

    const service = createFormSubmissionService()
    const submissions = await service.getTeacherSubmissions()
    const metrics = await buildTeacherRoleMetrics(submissions)

    return NextResponse.json({
      metrics,
      summary: {
        totalSubmissions: metrics.totalSubmissions,
        uniqueStudents: metrics.uniqueStudents,
      },
    })
  } catch (error) {
    console.error('Teacher metrics API error:', error)
    return NextResponse.json({ error: 'Failed to fetch teacher metrics' }, { status: 500 })
  }
}
