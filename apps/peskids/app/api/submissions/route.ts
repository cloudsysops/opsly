import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  try {
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'
    const userRole = 'parent'

    // Mock submissions data - will be replaced with Supabase query
    // when form_submission table is created
    const mockSubmissions = [
      {
        formId: 'form-1',
        formTitle: 'Encuesta de Satisfacción',
        submissionId: 'sub-1',
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed' as const,
      },
      {
        formId: 'form-2',
        formTitle: 'Retroalimentación del Programa',
        submissionId: 'sub-2',
        submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'completed' as const,
      },
      {
        formId: 'form-3',
        formTitle: 'Evaluación de Docentes',
        submissionId: 'sub-3',
        submittedAt: new Date().toISOString(),
        status: 'pending' as const,
      },
    ]

    return NextResponse.json({
      submissions: mockSubmissions,
      count: mockSubmissions.length,
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
