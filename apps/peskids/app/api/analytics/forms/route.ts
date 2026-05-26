import { NextRequest, NextResponse } from 'next/server'
import { validateStaffSession } from '@/lib/staff-auth'
import { isOperationalStaffUser } from '../../../../lib/staff-user'
import { createFormSubmissionService } from '@/lib/services/form-submission.service'

export async function GET(_req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await validateStaffSession()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }
    if (auth.method !== 'secret' && auth.user && !isOperationalStaffUser(auth.user)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'

    const service = createFormSubmissionService()
    const metrics = await service.getFormAnalytics()
    const totalSubmissions = metrics.reduce((sum, form) => sum + form.submissionsCount, 0)

    return NextResponse.json({
      metrics,
      summary: {
        totalForms: metrics.length,
        totalSubmissions,
        tenantId,
      },
    })
  } catch (error) {
    console.error('Form analytics API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch form analytics' },
      { status: 500 }
    )
  }
}
