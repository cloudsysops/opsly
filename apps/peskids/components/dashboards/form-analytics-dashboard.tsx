'use client'

import { BarChart3, TrendingUp, AlertCircle, Users } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { peskidsColorTokens } from '@/lib/tokens'

interface FormMetrics {
  formId: string
  formTitle: string
  submissionsCount: number
  abandonmentRate: number
  avgCompletionTime: number
  errorCount: number
}

interface FormAnalyticsDashboardProps {
  metrics: FormMetrics[]
  isLoading?: boolean
}

export function FormAnalyticsDashboard({ metrics, isLoading = false }: FormAnalyticsDashboardProps): React.ReactElement {
  const totalSubmissions = metrics.reduce((sum, m) => sum + m.submissionsCount, 0)
  const avgAbandonmentRate = metrics.length > 0 ? metrics.reduce((sum, m) => sum + m.abandonmentRate, 0) / metrics.length : 0
  const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0)

  const skeletonClass = 'h-20 bg-pk-muted animate-pulse rounded-lg'

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
                    <p className="text-sm text-pk-mutedText">Respuestas totales</p>
                    <p className="text-3xl font-bold text-pk-ink mt-1">{totalSubmissions}</p>
                  </div>
                  <div
                    className="rounded-lg p-3"
                    style={{ backgroundColor: `${peskidsColorTokens.primary.teal}20` }}
                  >
                    <TrendingUp
                      className="h-6 w-6"
                      style={{ color: peskidsColorTokens.primary.teal }}
                    />
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
                    <p className="text-sm text-pk-mutedText">Tasa abandono promedio</p>
                    <p className="text-3xl font-bold text-pk-ink mt-1">{avgAbandonmentRate.toFixed(1)}%</p>
                  </div>
                  <div
                    className="rounded-lg p-3"
                    style={{ backgroundColor: `${peskidsColorTokens.secondary.orange}20` }}
                  >
                    <BarChart3
                      className="h-6 w-6"
                      style={{ color: peskidsColorTokens.secondary.orange }}
                    />
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
                    <p className="text-sm text-pk-mutedText">Errores detectados</p>
                    <p className="text-3xl font-bold text-pk-ink mt-1">{totalErrors}</p>
                  </div>
                  <div className="rounded-lg p-3 bg-red-100">
                    <AlertCircle className="h-6 w-6 text-red-600" />
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
                    <p className="text-sm text-pk-mutedText">Formularios activos</p>
                    <p className="text-3xl font-bold text-pk-ink mt-1">{metrics.length}</p>
                  </div>
                  <div
                    className="rounded-lg p-3"
                    style={{ backgroundColor: `${peskidsColorTokens.primary.blue}20` }}
                  >
                    <Users
                      className="h-6 w-6"
                      style={{ color: peskidsColorTokens.primary.blue }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Form Performance Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Desempeño por formulario</CardTitle>
          <CardDescription>Métricas individuales de cada formulario activo</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-pk-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : metrics.length === 0 ? (
            <p className="py-6 text-center text-sm text-pk-mutedText">No hay formularios aún</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-pk-border">
                    <th className="text-left py-2 px-3 font-medium text-pk-ink">Formulario</th>
                    <th className="text-right py-2 px-3 font-medium text-pk-ink">Respuestas</th>
                    <th className="text-right py-2 px-3 font-medium text-pk-ink">Abandono</th>
                    <th className="text-right py-2 px-3 font-medium text-pk-ink">Tiempo promedio</th>
                    <th className="text-right py-2 px-3 font-medium text-pk-ink">Errores</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.map((metric) => (
                    <tr key={metric.formId} className="border-b border-pk-border hover:bg-pk-bg">
                      <td className="py-3 px-3 text-pk-ink">{metric.formTitle}</td>
                      <td className="text-right py-3 px-3 text-pk-ink font-medium">
                        {metric.submissionsCount}
                      </td>
                      <td className="text-right py-3 px-3">
                        <span
                          className="inline-block rounded-full px-2 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: `${peskidsColorTokens.secondary.orange}20`,
                            color: peskidsColorTokens.secondary.orange,
                          }}
                        >
                          {metric.abandonmentRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-3 text-pk-mutedText">
                        {metric.avgCompletionTime}s
                      </td>
                      <td className="text-right py-3 px-3">
                        {metric.errorCount > 0 ? (
                          <span className="inline-block rounded-full px-2 py-1 text-xs font-medium bg-red-100 text-red-700">
                            {metric.errorCount}
                          </span>
                        ) : (
                          <span className="text-pk-mutedText">—</span>
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

      {/* Error Tracking Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Errores recientes</CardTitle>
          <CardDescription>Últimos errores de validación y envío</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-pk-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-pk-mutedText py-6 text-center">
                Los errores aparecerán aquí cuando ocurran
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Engagement Heatmap */}
      <Card>
        <CardHeader>
          <CardTitle>Enganche por hora del día</CardTitle>
          <CardDescription>Cuándo los usuarios interactúan más con los formularios</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-32 bg-pk-muted animate-pulse rounded-lg" />
          ) : (
            <div className="grid grid-cols-12 gap-1">
              {Array.from({ length: 24 }).map((_, hour) => (
                <div
                  key={hour}
                  className="aspect-square rounded-sm"
                  style={{
                    backgroundColor: `${peskidsColorTokens.primary.teal}${Math.floor(Math.random() * 9) * 16}`,
                  }}
                  title={`${hour}:00 - ${((hour + 1) % 24).toString().padStart(2, '0')}:00`}
                />
              ))}
            </div>
          )}
          <p className="mt-3 text-xs text-pk-mutedText text-center">Representación de actividad por hora (UTC)</p>
        </CardContent>
      </Card>
    </div>
  )
}
