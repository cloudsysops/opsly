'use client'

import { BookOpen, Users, CheckCircle, MessageSquare, Download } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { peskidsColorTokens } from '@/lib/tokens'

interface StudentSubmission {
  submissionId: string
  studentName: string
  studentId: string
  formTitle: string
  submittedAt: string
  grade?: number
  maxGrade: number
  feedback?: string
  status: 'reviewed' | 'pending' | 'needs_revision'
}

interface TeacherDashboardProps {
  submissions: StudentSubmission[]
  isLoading?: boolean
  onReviewSubmission?: (submissionId: string) => void
  onExportSubmissions?: () => void
}

export function TeacherDashboard({
  submissions,
  isLoading = false,
  onReviewSubmission,
  onExportSubmissions,
}: TeacherDashboardProps): React.ReactElement {
  const reviewedCount = submissions.filter((s) => s.status === 'reviewed').length
  const pendingCount = submissions.filter((s) => s.status === 'pending').length
  const needsRevisionCount = submissions.filter((s) => s.status === 'needs_revision').length
  const uniqueStudents = new Set(submissions.map((s) => s.studentId)).size

  const skeletonClass = 'h-20 bg-pk-muted animate-pulse rounded-lg'

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('es-CO', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'reviewed':
        return peskidsColorTokens.status.success
      case 'needs_revision':
        return '#dc2626'
      case 'pending':
        return peskidsColorTokens.secondary.orange
      default:
        return peskidsColorTokens.neutral.mediumGray
    }
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'reviewed':
        return 'Revisado'
      case 'needs_revision':
        return 'Requiere revisión'
      case 'pending':
        return 'Pendiente'
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className={skeletonClass} />
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-pk-mutedText">Estudiantes</p>
                    <p className="text-3xl font-bold text-pk-ink mt-1">{uniqueStudents}</p>
                  </div>
                  <div
                    className="rounded-lg p-3"
                    style={{ backgroundColor: `${peskidsColorTokens.primary.blue}20` }}
                  >
                    <Users className="h-6 w-6" style={{ color: peskidsColorTokens.primary.blue }} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className={skeletonClass} />
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-pk-mutedText">Respuestas revisadas</p>
                    <p className="text-3xl font-bold text-pk-ink mt-1">{reviewedCount}</p>
                  </div>
                  <div
                    className="rounded-lg p-3"
                    style={{ backgroundColor: `${peskidsColorTokens.status.success}20` }}
                  >
                    <CheckCircle className="h-6 w-6" style={{ color: peskidsColorTokens.status.success }} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className={skeletonClass} />
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-pk-mutedText">Pendientes de revisar</p>
                    <p className="text-3xl font-bold text-pk-ink mt-1">{pendingCount}</p>
                  </div>
                  <div className="rounded-lg p-3 bg-yellow-100">
                    <BookOpen className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className={skeletonClass} />
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-pk-mutedText">Requieren revisión</p>
                    <p className="text-3xl font-bold text-pk-ink mt-1">{needsRevisionCount}</p>
                  </div>
                  <div className="rounded-lg p-3 bg-red-100">
                    <MessageSquare className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student Submissions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Respuestas de estudiantes</CardTitle>
              <CardDescription>Revisa y califica las respuestas enviadas</CardDescription>
            </div>
            {onExportSubmissions && submissions.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onExportSubmissions}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-pk-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <p className="py-6 text-center text-sm text-pk-mutedText">
              No hay respuestas de estudiantes aún
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-pk-border">
                    <th className="text-left py-2 px-3 font-medium text-pk-ink">Estudiante</th>
                    <th className="text-left py-2 px-3 font-medium text-pk-ink">Formulario</th>
                    <th className="text-left py-2 px-3 font-medium text-pk-ink">Fecha</th>
                    <th className="text-center py-2 px-3 font-medium text-pk-ink">Calificación</th>
                    <th className="text-left py-2 px-3 font-medium text-pk-ink">Estado</th>
                    <th className="text-right py-2 px-3 font-medium text-pk-ink">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr key={submission.submissionId} className="border-b border-pk-border hover:bg-pk-bg">
                      <td className="py-3 px-3 text-pk-ink font-medium">{submission.studentName}</td>
                      <td className="py-3 px-3 text-pk-ink">{submission.formTitle}</td>
                      <td className="py-3 px-3 text-pk-mutedText text-xs">
                        {formatDate(submission.submittedAt)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {submission.grade !== undefined ? (
                          <span className="font-medium text-pk-ink">
                            {submission.grade}/{submission.maxGrade}
                          </span>
                        ) : (
                          <span className="text-pk-mutedText">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="inline-block rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: `${getStatusColor(submission.status)}20`,
                            color: getStatusColor(submission.status),
                          }}
                        >
                          {getStatusLabel(submission.status)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {onReviewSubmission && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onReviewSubmission(submission.submissionId)}
                          >
                            Revisar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessment Rubric */}
      <Card>
        <CardHeader>
          <CardTitle>Rúbrica de evaluación</CardTitle>
          <CardDescription>Criterios de evaluación para calificar respuestas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-pk-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-pk-mutedText py-6 text-center">
                Define una rúbrica de evaluación en la configuración del formulario
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones en lote</CardTitle>
          <CardDescription>Realiza acciones sobre múltiples respuestas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button type="button" variant="outline" size="sm" disabled={submissions.length === 0}>
              Marcar como revisadas
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={submissions.length === 0}>
              Enviar retroalimentación
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={submissions.length === 0}>
              Reasignar a estudiantes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
