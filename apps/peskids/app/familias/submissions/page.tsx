'use client'

import { useCallback, useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { SubmissionsDashboard } from '@/components/dashboards/submissions-dashboard'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase-browser'

interface FormSubmissionSummary {
  formId: string
  formTitle: string
  submissionId: string
  submittedAt: string
  status: 'completed' | 'pending' | 'reviewed'
}

export default function FamiliesSubmissionsPage(): React.ReactElement {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<FormSubmissionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authChecked, setAuthChecked] = useState(false)

  const fetchSubmissions = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/submissions', { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch submissions')
      const data = await response.json()
      setSubmissions(data.submissions || [])
      setError('')
    } catch (err) {
      setError('No se pudieron cargar tus respuestas. Intenta más tarde.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const supabase = createClient()
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession()
        if (!data.session?.user) {
          router.replace('/familias/login?next=%2Ffamilias%2Fsubmissions')
          return
        }
        const user = data.session.user
        const metadata = {
          ...((user.app_metadata ?? {}) as Record<string, unknown>),
          ...((user.user_metadata ?? {}) as Record<string, unknown>),
        }
        if (metadata.role !== 'family' || metadata.tenant_slug !== 'peskids') {
          await supabase.auth.updateUser({
            data: {
              role: 'family',
              tenant_slug: 'peskids',
            },
          })
        }
        setAuthChecked(true)
        void fetchSubmissions()
      } catch (err) {
        console.error(err)
        setError('No se pudo validar la sesión de familia.')
        setAuthChecked(true)
        setLoading(false)
      }
    })()
  }, [fetchSubmissions, router])

  const handleViewSubmission = (submissionId: string): void => {
    console.log('View submission:', submissionId)
    // TODO: Navigate to submission detail view
  }

  if (loading || !authChecked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-pk-bg">
        <Loader2 className="h-10 w-10 animate-spin text-pk-primary" aria-hidden />
        <p className="text-sm text-pk-sub">Validando acceso de familia…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pk-bg p-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-card">
          <p className="text-sm text-red-800">{error}</p>
          <Button className="mt-4" onClick={() => void fetchSubmissions()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pk-bg p-4 sm:p-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-pk-ink">Mis respuestas</h1>
          <p className="mt-2 text-sm text-pk-mutedText">
            Aquí encontrarás todos los formularios que has completado
          </p>
        </div>

        <SubmissionsDashboard
          submissions={submissions}
          isLoading={loading}
          onViewSubmission={handleViewSubmission}
        />
      </div>
    </div>
  )
}
