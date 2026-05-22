import { NextRequest, NextResponse } from 'next/server'
import { validateAdminRequest } from '@/lib/admin-auth'

export async function GET(req: NextRequest) {
  try {
    const auth = validateAdminRequest(req)
    if (!auth.valid) {
      return NextResponse.json({ error: auth.error }, { status: 401 })
    }

    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'

    // Mock form analytics data - will be replaced with Supabase query
    // when form_analytics table is created
    const mockFormMetrics = [
      {
        formId: 'form-1',
        formTitle: 'Encuesta de Satisfacción',
        submissionsCount: 45,
        abandonmentRate: 11,
        avgCompletionTime: 3.5,
        errorCount: 0,
      },
      {
        formId: 'form-2',
        formTitle: 'Retroalimentación del Programa',
        submissionsCount: 32,
        abandonmentRate: 24,
        avgCompletionTime: 5.2,
        errorCount: 2,
      },
      {
        formId: 'form-3',
        formTitle: 'Evaluación de Docentes',
        submissionsCount: 28,
        abandonmentRate: 15,
        avgCompletionTime: 4.1,
        errorCount: 0,
      },
    ]

    const totalSubmissions = mockFormMetrics.reduce((sum, form) => sum + form.submissionsCount, 0)

    return NextResponse.json({
      metrics: mockFormMetrics,
      summary: {
        totalForms: mockFormMetrics.length,
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
