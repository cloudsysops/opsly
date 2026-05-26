import { NextRequest, NextResponse } from 'next/server'
import { loadPeskidsBiSnapshot } from '../../../../../lib/bi-snapshot'
import { validateStaffRequest } from '@/lib/staff-auth'
import { isStaffUser } from '@/lib/staff-user'
import { createFormSubmissionService } from '@/lib/services/form-submission.service'
import { buildTeacherRoleMetrics } from '@/lib/role-metrics'
import { errorJson, resolveRequestId, successJson } from '@/lib/api-response'

export async function GET(req: NextRequest): Promise<NextResponse> {
  const requestId = resolveRequestId(req)
  try {
    const auth = await validateStaffRequest(req)
    if (!auth.ok) {
      return errorJson(requestId, auth.error, auth.status)
    }
    if (auth.method !== 'secret' && auth.user && !isStaffUser(auth.user)) {
      return errorJson(requestId, 'Forbidden', 403)
    }

    const snapshot = await loadPeskidsBiSnapshot()
    if (snapshot?.teacher) {
      return successJson(requestId, {
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

    return successJson(requestId, {
      metrics,
      summary: {
        totalSubmissions: metrics.totalSubmissions,
        uniqueStudents: metrics.uniqueStudents,
      },
    })
  } catch (error) {
    console.error('Teacher metrics API error:', error, { request_id: requestId })
    return errorJson(requestId, 'Failed to fetch teacher metrics', 500)
  }
}
