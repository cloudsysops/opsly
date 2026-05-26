import { NextRequest, NextResponse } from 'next/server'
import { createFormSubmissionService } from '@/lib/services/form-submission.service'
import { validateFamilyRequest } from '@/lib/family-auth'

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const auth = await validateFamilyRequest(req)
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const familyEmail = auth.user.email?.trim() ?? ''
    if (!familyEmail) {
      return NextResponse.json({ error: 'Family email not found in session' }, { status: 400 })
    }

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'
    const userRole = 'parent'

    const service = createFormSubmissionService()
    const submissions = await service.getParentSubmissions(familyEmail)

    return NextResponse.json({
      submissions,
      count: submissions.length,
      tenantId,
      userRole,
    })
  } catch (error) {
    console.error('Submissions API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch submissions' },
      { status: 500 }
    )
  }
}
