import { NextResponse } from 'next/server'

export async function GET(): Promise<NextResponse> {
  try {
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'

    // Mock student submissions data - will be replaced with Supabase query
    // when form_submission table is created
    const mockStudentSubmissions = [
      {
        submissionId: 'sub-101',
        studentName: 'Carlos García',
        studentId: 'std-1',
        formTitle: 'Evaluación de Matemáticas',
        submittedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        grade: 85,
        maxGrade: 100,
        feedback: 'Muy bien desarrollado, excelentes conceptos',
        status: 'reviewed' as const,
      },
      {
        submissionId: 'sub-102',
        studentName: 'María López',
        studentId: 'std-2',
        formTitle: 'Evaluación de Matemáticas',
        submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        grade: undefined,
        maxGrade: 100,
        feedback: undefined,
        status: 'pending' as const,
      },
      {
        submissionId: 'sub-103',
        studentName: 'Juan Rodríguez',
        studentId: 'std-3',
        formTitle: 'Evaluación de Lectura',
        submittedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        grade: 72,
        maxGrade: 100,
        feedback: 'Requiere mejorar en comprensión de textos',
        status: 'needs_revision' as const,
      },
      {
        submissionId: 'sub-104',
        studentName: 'Sofía Martínez',
        studentId: 'std-4',
        formTitle: 'Evaluación de Lectura',
        submittedAt: new Date().toISOString(),
        grade: undefined,
        maxGrade: 100,
        feedback: undefined,
        status: 'pending' as const,
      },
    ]

    const reviewedCount = mockStudentSubmissions.filter((s) => s.status === 'reviewed').length
    const pendingCount = mockStudentSubmissions.filter((s) => s.status === 'pending').length
    const needsRevisionCount = mockStudentSubmissions.filter(
      (s) => s.status === 'needs_revision'
    ).length
    const uniqueStudents = new Set(
      mockStudentSubmissions.map((s) => s.studentId)
    ).size

    return NextResponse.json({
      submissions: mockStudentSubmissions,
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
