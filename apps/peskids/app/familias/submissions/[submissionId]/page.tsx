'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Loader2, MessageSquare, Users } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'
import { FeedbackComposer } from '@/components/feedback/feedback-composer'
import { SubmissionChatPanel } from '@/components/chat/submission-chat-panel'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase-browser'

interface FormSubmissionSummary {
  formId: string
  formTitle: string
  submissionId: string
  submittedAt: string
  status: 'completed' | 'pending' | 'reviewed'
  studentName?: string
}

interface FamilyFeedbackNote {
  id: string
  child_name: string
  suggestion: string | null
  body: string | null
  author_type: 'parent' | 'teacher' | 'staff'
  visibility: 'public' | 'private'
  audience: 'family' | 'teacher' | 'admin'
  rating: number | null
  status: string
  created_at: string
  parent_email: string | null
}

function formatDateTime(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString('es-CO', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return dateString
  }
}

export default function FamilySubmissionDetailPage(): React.ReactElement {
  const router = useRouter()
  const params = useParams<{ submissionId: string }>()
  const submissionId = Array.isArray(params.submissionId) ? params.submissionId[0] : params.submissionId

  const [submissions, setSubmissions] = useState<FormSubmissionSummary[]>([])
  const [notes, setNotes] = useState<FamilyFeedbackNote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authChecked, setAuthChecked] = useState(false)
  const [familyEmail, setFamilyEmail] = useState<string | null>(null)
  const [familyUserId, setFamilyUserId] = useState<string | null>(null)

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      const [submissionsResponse, notesResponse] = await Promise.all([
        fetch('/api/submissions', { credentials: 'include' }),
        fetch('/api/families/feedback', { credentials: 'include' }),
      ])

      if (!submissionsResponse.ok) throw new Error('Failed to fetch submissions')
      const submissionsData = await submissionsResponse.json()
      setSubmissions(submissionsData.submissions || [])

      if (notesResponse.ok) {
        const notesData = (await notesResponse.json()) as { feedback?: FamilyFeedbackNote[] }
        setNotes(notesData.feedback || [])
      } else {
        setNotes([])
      }
      setError('')
    } catch (err) {
      setError('No se pudo cargar la ficha de la entrega. Intenta más tarde.')
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
          router.replace(`/familias/login?next=${encodeURIComponent(`/familias/submissions/${submissionId}`)}`)
          return
        }
        const user = data.session.user
        setFamilyEmail(user.email ?? null)
        setFamilyUserId(user.id)
        setAuthChecked(true)
        void fetchData()
      } catch (err) {
        console.error(err)
        setError('No se pudo validar la sesión de familia.')
        setAuthChecked(true)
        setLoading(false)
      }
    })()
  }, [fetchData, router, submissionId])

  const selectedSubmission = useMemo(
    () => submissions.find((submission) => submission.submissionId === submissionId) ?? null,
    [submissionId, submissions]
  )

  const publicNotes = useMemo(
    () => notes.filter((note) => note.visibility !== 'private'),
    [notes]
  )

  const privateNotes = useMemo(
    () => notes.filter((note) => note.visibility === 'private'),
    [notes]
  )

  if (loading || !authChecked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-pk-bg">
        <Loader2 className="h-10 w-10 animate-spin text-pk-primary" aria-hidden />
        <p className="text-sm text-pk-sub">Cargando ficha de la entrega…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pk-bg p-4">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center shadow-card">
          <p className="text-sm text-red-800">{error}</p>
          <Button className="mt-4" onClick={() => void fetchData()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  if (!selectedSubmission) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pk-bg p-4">
        <div className="max-w-lg rounded-2xl border border-pk-border bg-white p-6 text-center shadow-card">
          <p className="text-lg font-semibold text-pk-ink">No encontramos esta entrega</p>
          <p className="mt-2 text-sm text-pk-sub">
            Puede que ya no exista o que todavía no haya cargado en esta sesión.
          </p>
          <Button className="mt-4" onClick={() => router.push('/familias/submissions')}>
            Volver a respuestas
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-pk-bg p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-pk-border bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
                Portal de familias
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pk-ink sm:text-3xl">
                {selectedSubmission.studentName || 'Tu entrega'}
              </h1>
              <p className="mt-2 text-sm leading-6 text-pk-sub">
                {selectedSubmission.formTitle} · {formatDateTime(selectedSubmission.submittedAt)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => router.push('/familias/submissions')}>
                <ArrowLeft className="h-4 w-4" aria-hidden />
                <span className="ml-1">Volver</span>
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-pk-mutedText">Estado</p>
              <Badge tone={selectedSubmission.status === 'reviewed' ? 'green' : selectedSubmission.status === 'pending' ? 'amber' : 'teal'} className="mt-2">
                {selectedSubmission.status}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-pk-mutedText">Formulario</p>
              <p className="mt-1 text-xl font-semibold text-pk-ink">{selectedSubmission.formTitle}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-pk-mutedText">Envío</p>
              <p className="mt-1 text-xl font-semibold text-pk-ink">{formatDateTime(selectedSubmission.submittedAt)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-pk-mutedText">Familia</p>
              <p className="mt-1 text-xl font-semibold text-pk-ink">{familyEmail || '—'}</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-pk-primary" aria-hidden />
                Progreso
              </CardTitle>
              <CardDescription>Referencia del avance del grupo para esta entrega.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-pk-sub">
                El detalle del progreso lo revisa el equipo docente y se actualiza con el seguimiento de clase.
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-pk-primary" aria-hidden />
                Observaciones del profesor
              </CardTitle>
              <CardDescription>Lo que el equipo docente ya dejó para esta entrega.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-2xl border border-pk-border bg-pk-muted/25 p-4">
                <p className="text-sm text-pk-sub">
                  {selectedSubmission.studentName
                    ? `Esta entrega pertenece a ${selectedSubmission.studentName}.`
                    : 'Esta entrega pertenece a tu peque.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="overflow-hidden border-pk-border bg-white shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Notas de Peskids</CardTitle>
            <CardDescription>
              Feedback del profesor y notas privadas del equipo para esta familia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {notes.length > 0 ? (
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="rounded-3xl border border-pk-border bg-pk-snow p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-pk-mutedText">
                        Feedback público
                      </p>
                      <p className="text-sm text-pk-sub">{publicNotes.length} nota(s) visibles</p>
                    </div>
                    <Badge tone="green">Profesor</Badge>
                  </div>
                  <div className="mt-4 space-y-3">
                    {publicNotes.length > 0 ? (
                      publicNotes.map((note) => (
                        <div key={note.id} className="rounded-2xl border border-pk-border bg-white p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-pk-ink">{note.child_name}</p>
                              <p className="text-xs text-pk-mutedText">
                                {new Date(note.created_at).toLocaleDateString('es-CO')}
                              </p>
                            </div>
                            <Badge tone={note.author_type === 'staff' ? 'teal' : 'violet'}>
                              {note.author_type === 'staff' ? 'Equipo' : 'Profesor'}
                            </Badge>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-pk-sub">
                            {note.body ?? note.suggestion ?? 'Sin contenido'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-pk-border bg-white px-4 py-6 text-sm text-pk-sub">
                        No hay feedback público todavía.
                      </p>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-pk-border bg-pk-deep p-4 text-white">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/70">
                        Notas del equipo
                      </p>
                      <p className="text-sm text-white/75">{privateNotes.length} nota(s) privadas</p>
                    </div>
                    <Badge tone="violet">Privado</Badge>
                  </div>
                  <div className="mt-4 space-y-3">
                    {privateNotes.length > 0 ? (
                      privateNotes.map((note) => (
                        <div key={note.id} className="rounded-2xl border border-white/10 bg-white/10 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-semibold text-white">{note.child_name}</p>
                              <p className="text-xs text-white/60">
                                {new Date(note.created_at).toLocaleDateString('es-CO')}
                              </p>
                            </div>
                            <Badge tone="neutral">Solo familia</Badge>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-white/85">
                            {note.body ?? note.suggestion ?? 'Sin contenido'}
                          </p>
                        </div>
                      ))
                    ) : (
                      <p className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-6 text-sm text-white/70">
                        No hay notas privadas todavía.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-pk-sub">Todavía no hay notas para mostrar.</p>
            )}
          </CardContent>
        </Card>

        <FeedbackComposer
          title="Feedback para el profesor"
          description="Escribe aquí la opinión de tu familia sobre esta clase."
          submitLabel="Enviar feedback"
          authorType="parent"
          subjectType="class"
          childNameLabel="Nombre del niño o niña"
          childNameDefault={selectedSubmission.studentName ?? ''}
          parentEmail={familyEmail}
          authorRefId={familyUserId}
          visibility="public"
          audience="teacher"
          subjectHint="Tu comentario llega al equipo de Peskids como una nota directa para el profesor y el seguimiento."
        />

        <SubmissionChatPanel
          submissionId={submissionId}
          title="Chat con el profesor"
          description="Escribe aquí para coordinar materiales, avisar si llegarán tarde o ajustar la clase."
          sendLabel="Enviar a profesor"
          placeholder="Cuéntale al profesor lo que necesitas ajustar..."
          className="mt-4"
        />
      </div>
    </div>
  )
}
