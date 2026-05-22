'use client'

import { ArrowRight, Clock } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { peskidsColorTokens } from '@/lib/tokens'

interface FormSubmissionSummary {
  formId: string
  formTitle: string
  submissionId: string
  submittedAt: string
  status: 'completed' | 'pending' | 'reviewed'
}

interface SubmissionsDashboardProps {
  submissions: FormSubmissionSummary[]
  isLoading?: boolean
  onViewSubmission?: (submissionId: string) => void
}

export function SubmissionsDashboard({
  submissions,
  isLoading = false,
  onViewSubmission,
}: SubmissionsDashboardProps): React.ReactElement {
  const completedCount = submissions.filter((s) => s.status === 'completed').length
  const pendingCount = submissions.filter((s) => s.status === 'pending').length
  const reviewedCount = submissions.filter((s) => s.status === 'reviewed').length

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
      case 'completed':
        return peskidsColorTokens.status.success
      case 'reviewed':
        return peskidsColorTokens.primary.blue
      case 'pending':
        return peskidsColorTokens.secondary.orange
      default:
        return peskidsColorTokens.neutral.mediumGray
    }
  }

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'Completado'
      case 'reviewed':
        return 'Revisado'
      case 'pending':
        return 'Pendiente'
      default:
        return status
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className={skeletonClass} />
            ) : (
              <div>
                <p className="text-sm text-pk-mutedText">Respuestas completadas</p>
                <p className="text-3xl font-bold text-pk-ink mt-1">{completedCount}</p>
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
                <p className="text-sm text-pk-mutedText">Respuestas revisadas</p>
                <p className="text-3xl font-bold text-pk-ink mt-1">{reviewedCount}</p>
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
                <p className="text-sm text-pk-mutedText">Respuestas pendientes</p>
                <p className="text-3xl font-bold text-pk-ink mt-1">{pendingCount}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Forms */}
      <Card>
        <CardHeader>
          <CardTitle>Formularios disponibles</CardTitle>
          <CardDescription>Haz clic en un formulario para responder o ver tus respuestas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-pk-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-pk-mutedText py-6 text-center">
                Los formularios disponibles aparecerán aquí
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Submissions */}
      <Card>
        <CardHeader>
          <CardTitle>Respuestas recientes</CardTitle>
          <CardDescription>Tu historial de respuestas enviadas</CardDescription>
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
              No tienes respuestas aún. Completa un formulario para que aparezca aquí.
            </p>
          ) : (
            <div className="space-y-3">
              {submissions.map((submission) => (
                <div
                  key={submission.submissionId}
                  className="flex items-center justify-between rounded-lg border border-pk-border p-4 hover:bg-pk-bg transition"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-pk-ink truncate">{submission.formTitle}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-pk-mutedText">
                      <Clock className="h-3 w-3" />
                      {formatDate(submission.submittedAt)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4">
                    <span
                      className="inline-block rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap"
                      style={{
                        backgroundColor: `${getStatusColor(submission.status)}20`,
                        color: getStatusColor(submission.status),
                      }}
                    >
                      {getStatusLabel(submission.status)}
                    </span>

                    {onViewSubmission && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewSubmission(submission.submissionId)}
                        className="gap-1"
                      >
                        Ver
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Response Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Tus estadísticas</CardTitle>
          <CardDescription>Resumen de tu actividad en formularios</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="grid gap-4 grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-pk-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
              <div className="rounded-lg bg-pk-bg p-3">
                <p className="text-xs text-pk-mutedText">Formularios completados</p>
                <p className="text-2xl font-bold text-pk-ink mt-1">{submissions.length}</p>
              </div>
              <div className="rounded-lg bg-pk-bg p-3">
                <p className="text-xs text-pk-mutedText">Tasa completitud</p>
                <p className="text-2xl font-bold text-pk-ink mt-1">
                  {submissions.length > 0 ? '100%' : '—'}
                </p>
              </div>
              <div className="rounded-lg bg-pk-bg p-3">
                <p className="text-xs text-pk-mutedText">Formularios activos</p>
                <p className="text-2xl font-bold text-pk-ink mt-1">—</p>
              </div>
              <div className="rounded-lg bg-pk-bg p-3">
                <p className="text-xs text-pk-mutedText">Último envío</p>
                <p className="text-2xl font-bold text-pk-ink mt-1">
                  {submissions.length > 0 ? 'Hoy' : '—'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
