'use client'

import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react'
import Link from 'next/link'
import { CalendarClock, Gift, Loader2, MessageSquare } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { SubmissionsDashboard } from '@/components/dashboards/submissions-dashboard'
import { FeedbackComposer } from '@/components/feedback/feedback-composer'
import { GrowthWidget } from '@/components/progress/growth-widget'
import { MascotPathWidget } from '@/components/progress/mascot-path-widget'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { buildWhatsAppUrl } from '@/lib/contact-channels'
import { createClient } from '@/lib/supabase-browser'

interface FormSubmissionSummary {
  formId: string
  formTitle: string
  submissionId: string
  submittedAt: string
  status: 'completed' | 'pending' | 'reviewed'
  studentName?: string
}

interface FamilyEnrollment {
  status: 'reserved' | 'confirmed' | 'cancelled' | 'no_show' | 'attended'
  class_title?: string
  starts_at?: string
  ends_at?: string
}

const ENROLLMENT_STATUS_LABEL: Record<FamilyEnrollment['status'], string> = {
  reserved: 'Reservada',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  no_show: 'No asistió',
  attended: 'Asistió',
}

function formatClassStart(startsAt: string): string {
  const date = new Date(startsAt)
  const isToday = date.toDateString() === new Date().toDateString()
  const time = date.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
  if (isToday) return `Hoy · ${time}`
  const day = date.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
  return `${day} · ${time}`
}

interface FamilyBadge {
  id: string
  label: string
  created_at: string
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

export default function FamiliesSubmissionsPage(): React.ReactElement {
  const router = useRouter()
  const [submissions, setSubmissions] = useState<FormSubmissionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [authChecked, setAuthChecked] = useState(false)
  const [familyEmail, setFamilyEmail] = useState<string | null>(null)
  const [familyUserId, setFamilyUserId] = useState<string | null>(null)
  const [familyNotes, setFamilyNotes] = useState<FamilyFeedbackNote[]>([])
  const [nextClass, setNextClass] = useState<FamilyEnrollment | null>(null)
  const [badges, setBadges] = useState<FamilyBadge[]>([])

  const fetchNextClass = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/portal/enrollments', { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch enrollments')
      const data = (await response.json()) as { enrollments?: FamilyEnrollment[] }
      const now = Date.now()
      const upcoming = (data.enrollments ?? [])
        .filter(
          (enrollment) =>
            enrollment.starts_at &&
            new Date(enrollment.starts_at).getTime() > now &&
            enrollment.status !== 'cancelled'
        )
        .sort((a, b) => new Date(a.starts_at!).getTime() - new Date(b.starts_at!).getTime())
      setNextClass(upcoming[0] ?? null)
    } catch (err) {
      console.error(err)
      setNextClass(null)
    }
  }, [])

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

  const fetchFamilyNotes = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/families/feedback', { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch family feedback')
      const data = (await response.json()) as { feedback?: FamilyFeedbackNote[] }
      setFamilyNotes(data.feedback || [])
    } catch (err) {
      console.error(err)
      setFamilyNotes([])
    }
  }, [])

  const fetchBadges = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/portal/badges', { credentials: 'include' })
      if (!response.ok) throw new Error('Failed to fetch badges')
      const data = (await response.json()) as { badges?: FamilyBadge[] }
      setBadges(data.badges || [])
    } catch (err) {
      console.error(err)
      setBadges([])
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
        setFamilyEmail(user.email ?? null)
        setFamilyUserId(user.id)
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
        void fetchFamilyNotes()
        void fetchNextClass()
        void fetchBadges()
      } catch (err) {
        console.error(err)
        setError('No se pudo validar la sesión de familia.')
        setAuthChecked(true)
        setLoading(false)
      }
    })()
  }, [fetchBadges, fetchFamilyNotes, fetchNextClass, fetchSubmissions, router])

  const handleViewSubmission = (submissionId: string): void => {
    router.push(`/familias/submissions/${submissionId}`)
  }

  const publicNotes = useMemo(
    () => familyNotes.filter((note) => note.visibility !== 'private'),
    [familyNotes]
  )
  const privateNotes = useMemo(
    () => familyNotes.filter((note) => note.visibility === 'private'),
    [familyNotes]
  )

  const defaultChildName = submissions[0]?.studentName ?? ''

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
        <div className="max-w-md rounded-2xl border border-red-200/50 bg-red-50/20 p-6 text-center shadow-card">
          <p className="text-sm text-red-800/80">{error}</p>
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
        <div className="mb-8 overflow-hidden rounded-pk-lg border border-pk-border bg-gradient-to-br from-white via-white to-teal-50/60 shadow-card">
          <div className="grid gap-6 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-10 lg:py-10">
            <div>
              <p className="pk-eyebrow">Panel familias</p>
              <h1 className="mt-4 max-w-2xl text-2xl font-semibold tracking-tight text-pk-ink sm:text-3xl lg:text-4xl">
                Tu progreso, tus clases y tu feedback, en una sola portada.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-relaxed text-pk-sub sm:text-lg">
                Aquí puedes revisar respuestas, dejar feedback al profesor y seguir el avance de
                tu peque sin perder tiempo entre pantallas.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                  Ver progreso
                </Button>
                <Button type="button" variant="secondary" onClick={() => window.scrollTo({ top: 900, behavior: 'smooth' })}>
                  Ver feedback
                </Button>
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4">
                <FamilyMetricCard value={String(submissions.length)} label="respuestas" />
                <FamilyMetricCard value={String(reviewedCountFrom(submissions))} label="revisadas" />
                <FamilyMetricCard value={String(pendingCountFrom(submissions))} label="pendientes" />
                <FamilyMetricCard value="Tiempo real" label="mensajes" compact />
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-pk-lg border border-pk-border bg-pk-surface p-5 shadow-card-hover">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-pk-mutedText">
                      Próxima clase
                    </p>
                    <p className="mt-1 text-2xl font-bold tracking-tight text-pk-ink">
                      {nextClass?.starts_at ? formatClassStart(nextClass.starts_at) : 'Sin próxima clase'}
                    </p>
                    {nextClass?.class_title && (
                      <p className="mt-1 text-sm text-pk-sub">{nextClass.class_title}</p>
                    )}
                  </div>
                  {nextClass ? (
                    <span className="rounded-full bg-pk-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-pk-primary">
                      {ENROLLMENT_STATUS_LABEL[nextClass.status]}
                    </span>
                  ) : null}
                </div>
                {!nextClass && (
                  <p className="mt-2 text-sm text-pk-sub">
                    Todavía no tienes una clase próxima agendada.
                  </p>
                )}

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <MiniFamilyAction icon={CalendarClock} label="Reservar" href="/familias/reservas" />
                  <MiniFamilyAction
                    icon={MessageSquare}
                    label="Mensaje"
                    href={buildWhatsAppUrl({
                      prefill: 'Hola Peskids, tengo una pregunta sobre la clase de mi hijo/a.',
                    })}
                    external
                  />
                  <MiniFamilyAction
                    icon={Gift}
                    label="Referidos"
                    href={buildWhatsAppUrl({
                      prefill: 'Hola Peskids, quiero referir a otra familia. ¿Cómo funciona?',
                    })}
                    external
                  />
                </div>
              </div>

              <div className="rounded-pk-lg border border-pk-border bg-pk-deep p-5 text-white shadow-card-hover">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/70">
                  Vista rápida
                </p>
                <p className="mt-2 text-lg font-bold">Familia al día</p>
                <p className="mt-2 text-sm leading-6 text-white/80">
                  El equipo puede revisar tu avance, tu feedback y tus próximos pasos sin
                  esconder la información importante.
                </p>
              </div>
            </div>
          </div>
        </div>

        <GrowthWidget
          eyebrow="Progreso familiar"
          title="Objetivos, visión y logros del peque"
          description="Una lectura rápida para que sepas qué avanza, qué sigue y qué logros ya quedaron marcados."
          mission="Acompañar al niño con constancia, confianza y claridad para que cada clase sume."
          vision="Un peque autónomo en el agua y una familia que entiende el camino sin fricción."
          objectives={['Asistencia', 'Confianza', 'Técnica']}
          achievements={badges.map((badge) => badge.label)}
          streakLabel="Racha familiar"
          streakValue="8"
          progressLabel="Progreso hacia la siguiente etapa"
          progressPercent={62}
          accent="amber"
          className="mb-8"
        />

        <MascotPathWidget
          className="mb-8"
          title="Tu mascota del agua"
          description="Cada peque elige un avatar y lo hace crecer mientras avanza por etapas."
        />

        <Card className="mb-8 overflow-hidden border-pk-border bg-pk-surface shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Notas de Peskids</CardTitle>
            <CardDescription>
              Feedback del profesor y notas privadas del equipo para esta familia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {familyNotes.length > 0 ? (
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
                        <div key={note.id} className="rounded-2xl border border-pk-border bg-pk-surface p-4">
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
                      <p className="rounded-2xl border border-dashed border-pk-border bg-pk-surface px-4 py-6 text-sm text-pk-sub">
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

        <div className="mb-8 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-pk-border bg-gradient-to-br from-white via-white to-teal-50/50 p-6 shadow-card">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
              Peskids / Familias
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight text-pk-ink">
              También puedes dejar feedback al profesor desde aquí.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-pk-sub">
              Cuéntanos cómo va la clase, qué le ayuda más a tu hijo o hija y qué deberíamos ajustar para la próxima sesión.
            </p>
          </div>

        <FeedbackComposer
          title="Feedback para el profesor"
          description="Escribe aquí la opinión de tu familia sobre la clase."
          submitLabel="Enviar feedback"
          authorType="parent"
          subjectType="class"
          childNameLabel="Nombre del niño o niña"
          childNameDefault={defaultChildName}
          parentEmail={familyEmail}
          authorRefId={familyUserId}
          visibility="public"
          audience="teacher"
          subjectHint="Tu comentario llega al equipo de Peskids como una nota directa para el profesor y el seguimiento."
        />
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

function reviewedCountFrom(submissions: FormSubmissionSummary[]): number {
  return submissions.filter((submission) => submission.status === 'reviewed').length
}

function pendingCountFrom(submissions: FormSubmissionSummary[]): number {
  return submissions.filter((submission) => submission.status === 'pending').length
}

function FamilyMetricCard({
  value,
  label,
  compact = false,
}: {
  value: string
  label: string
  compact?: boolean
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-pk-border bg-pk-surface p-4 shadow-card">
      <p className={compact ? 'text-sm font-semibold text-pk-ink' : 'text-2xl font-bold text-pk-ink'}>
        {value}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-pk-mutedText">{label}</p>
    </div>
  )
}

function MiniFamilyAction({
  icon: Icon,
  label,
  href,
  external = false,
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  label: string
  href: string
  external?: boolean
}): React.ReactElement {
  return (
    <Link
      href={href}
      target={external ? '_blank' : undefined}
      rel={external ? 'noopener noreferrer' : undefined}
      className="block rounded-2xl border border-pk-border bg-pk-snow px-3 py-3 text-center transition hover:border-pk-primary/40 hover:bg-pk-primary/5"
    >
      <Icon className="mx-auto h-4 w-4 text-pk-primary" aria-hidden />
      <p className="mt-2 text-[11px] font-semibold text-pk-ink">{label}</p>
    </Link>
  )
}
