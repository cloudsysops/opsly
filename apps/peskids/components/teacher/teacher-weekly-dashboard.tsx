'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ClipboardList,
  MessageSquare,
  Loader2,
  PencilLine,
  RotateCcw,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { TeacherDashboard } from '@/components/dashboards/teacher-dashboard'
import { GrowthWidget } from '@/components/progress/growth-widget'
import { cn } from '@/lib/utils'

type DaySlot = {
  day: string
  time: string
  className: string
  students: number
  status: 'scheduled' | 'ongoing' | 'done'
}

type TeacherNote = {
  id: string
  student: string
  className: string
  note: string
  priority: 'alta' | 'media' | 'baja'
}

type TeacherSubmission = {
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

type TeacherSubmissionsResponse = {
  submissions: TeacherSubmission[]
  stats: {
    reviewedCount: number
    pendingCount: number
    needsRevisionCount: number
    uniqueStudents: number
  }
}

type TeacherRoleMetrics = {
  totalSubmissions: number
  reviewedCount: number
  pendingCount: number
  needsRevisionCount: number
  uniqueStudents: number
  uniqueFamilies: number
  averageGrade: number
  averageProgress: number
  activeChatThreads: number
  recentFamilyMessages: number
  latestActivityAt: string | null
}

type CalendarTimelineItem = {
  time: string
  title: string
  tag: string
  tone: 'teal' | 'slate'
  highlight?: boolean
}

const weeklyAgenda: DaySlot[] = [
  { day: 'Lun', time: '07:00', className: 'Grupo Iniciación', students: 8, status: 'done' },
  { day: 'Mar', time: '16:00', className: 'Técnica Junior', students: 10, status: 'scheduled' },
  { day: 'Mié', time: '07:00', className: 'Grupo Iniciación', students: 8, status: 'ongoing' },
  { day: 'Jue', time: '16:00', className: 'Avanzado', students: 6, status: 'scheduled' },
  { day: 'Vie', time: '07:00', className: 'Seguimiento familiar', students: 5, status: 'scheduled' },
]

const teacherNotes: TeacherNote[] = [
  {
    id: 'note-1',
    student: 'Salomé',
    className: 'Grupo Iniciación',
    note: 'Mejoró respiración; revisar confianza en desplazamiento.',
    priority: 'media',
  },
  {
    id: 'note-2',
    student: 'Tomás',
    className: 'Técnica Junior',
    note: 'Solicitar apoyo visual en la salida y mantener ritmo corto.',
    priority: 'alta',
  },
  {
    id: 'note-3',
    student: 'María José',
    className: 'Avanzado',
    note: 'Muy buen control, dejar como referente del grupo.',
    priority: 'baja',
  },
]

const classCards = [
  {
    title: 'Hoy',
    description: 'Clases programadas para el día',
    value: '3',
    tone: 'teal',
  },
  {
    title: 'Asistencia',
    description: 'Promedio de la semana',
    value: '92%',
    tone: 'green',
  },
  {
    title: 'Alertas',
    description: 'Observaciones pendientes',
    value: '2',
    tone: 'amber',
  },
  {
    title: 'Familias',
    description: 'Mensajes por responder',
    value: '4',
    tone: 'violet',
  },
] as const

const monthWeeks = [
  [null, null, 1, 2, 3, 4, 5],
  [6, 7, 8, 9, 10, 11, 12],
  [13, 14, 15, 16, 17, 18, 19],
  [20, { d: 21, today: true }, 22, 23, { d: 24, has: true }, 25, 26],
  [27, 28, 29, 30, 31, null, null],
] as const

const calendarTimeline: CalendarTimelineItem[] = [
  { time: '7:00', title: 'Iniciación · Llanogrande', tag: 'Grupo pequeño', tone: 'teal' },
  { time: '10:30', title: 'Técnica Junior', tag: 'Trabajo respiración', tone: 'slate' },
  { time: '3:30', title: 'Hoy · Grupo Iniciación', tag: 'Clase confirmada', tone: 'teal', highlight: true },
  { time: '5:00', title: 'Avanzado', tag: 'Pendiente de asistencia', tone: 'slate' },
] as const

function TeacherCalendarShowcase(): React.ReactElement {
  const dayLabels = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

  return (
    <div className="overflow-hidden rounded-[2rem] border border-pk-border bg-white shadow-hero">
      <div className="flex items-center justify-between gap-4 border-b border-pk-border bg-pk-snow px-5 py-4">
        <div>
          <p className="font-bold text-pk-ink">Calendario semanal</p>
          <p className="text-xs text-pk-mutedText">Agenda semanal y ritmo del día</p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-full border border-pk-border bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-pk-mutedText">
            Semana activa
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-7 gap-1">
          {dayLabels.map((label) => (
            <div key={label} className="pb-1 text-center text-[10px] font-bold uppercase tracking-[0.08em] text-pk-mutedText">
              {label}
            </div>
          ))}
          {monthWeeks.flat().map((cell, index) => {
            if (cell === null) return <div key={index} />
            const day = typeof cell === 'object' ? cell.d : cell
            const today = typeof cell === 'object' && 'today' in cell && cell.today
            const has = typeof cell === 'object' && 'has' in cell && cell.has

            return (
              <div
                key={index}
                className={cn(
                  'relative flex aspect-square items-center justify-center rounded-xl border text-sm font-bold',
                  today ? 'border-pk-deep bg-pk-deep text-white' : has ? 'border-pk-primary text-pk-ink' : 'border-transparent text-pk-ink'
                )}
              >
                {day}
                {has && !today ? <span className="absolute bottom-1 h-1 w-1 rounded-full bg-pk-primary" /> : null}
                {today ? <span className="absolute bottom-1 h-1 w-1 rounded-full bg-pk-sun" /> : null}
              </div>
            )
          })}
        </div>

        <div className="mt-4 space-y-2">
          {calendarTimeline.map((item) => {
            const toneMap = {
              teal: 'bg-pk-primary text-white',
              slate: 'border border-pk-border bg-pk-snow text-pk-ink',
            } as const

            return (
              <div
                key={item.title}
                className={cn('rounded-2xl px-3 py-3', toneMap[item.tone], item.highlight && 'shadow-card-hover')}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-mono text-[10px] uppercase tracking-[0.18em] opacity-80">{item.time}</p>
                  {item.highlight ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : null}
                </div>
                <p className="mt-1 text-sm font-bold">{item.title}</p>
                <p className={cn('mt-1 text-[11px]', item.tone === 'slate' ? 'opacity-70' : 'opacity-90')}>
                  {item.tag}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export function TeacherWeeklyDashboard(): React.ReactElement {
  const [teacherData, setTeacherData] = useState<TeacherSubmissionsResponse | null>(null)
  const [isLoadingTeacherData, setIsLoadingTeacherData] = useState(true)
  const [teacherDataError, setTeacherDataError] = useState<string | null>(null)
  const [teacherMetrics, setTeacherMetrics] = useState<TeacherRoleMetrics | null>(null)

  const todayAgenda = useMemo(
    () => weeklyAgenda.filter((slot) => slot.day === 'Mié' || slot.status !== 'done'),
    []
  )

  const responseCards = useMemo(() => {
    if (!teacherData) {
      return classCards
    }

    const activeThreads = teacherMetrics?.activeChatThreads ?? 0
    const averageProgress = teacherMetrics?.averageProgress ?? 0

    return [
      {
        title: 'Estudiantes',
        description: 'Con entregas activas',
        value: String(teacherMetrics?.uniqueStudents ?? teacherData.stats.uniqueStudents),
        tone: 'teal',
      },
      {
        title: 'Revisadas',
        description: 'Entregas cerradas',
        value: String(teacherMetrics?.reviewedCount ?? teacherData.stats.reviewedCount),
        tone: 'green',
      },
      {
        title: 'Chats activos',
        description: 'Hilos con familia',
        value: String(activeThreads),
        tone: 'violet',
      },
      {
        title: 'Progreso medio',
        description: 'Avance del grupo',
        value: `${averageProgress}%`,
        tone: 'amber',
      },
    ] as const
  }, [teacherData, teacherMetrics])

  useEffect(() => {
    const controller = new AbortController()

    const loadTeacherData = async (): Promise<void> => {
      try {
        setIsLoadingTeacherData(true)
        setTeacherDataError(null)

        const response = await fetch('/api/submissions/teacher', {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(`Teacher submissions request failed with ${response.status}`)
        }

        const payload = (await response.json()) as TeacherSubmissionsResponse
        if (!controller.signal.aborted) {
          setTeacherData(payload)
        }
      } catch (error_) {
        if (!controller.signal.aborted) {
          const message = error_ instanceof Error ? error_.message : 'No se pudieron cargar las entregas.'
          setTeacherDataError(message)
          setTeacherData(null)
          setTeacherMetrics(null)
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingTeacherData(false)
        }
      }

      try {
        const metricsResponse = await fetch('/api/submissions/teacher/metrics', {
          signal: controller.signal,
        })
        if (metricsResponse.ok) {
          const metricsPayload = (await metricsResponse.json()) as { metrics?: TeacherRoleMetrics }
          if (!controller.signal.aborted) {
            setTeacherMetrics(metricsPayload.metrics ?? null)
          }
        }
      } catch (error_) {
        if (!controller.signal.aborted) {
          console.warn('Teacher metrics unavailable:', error_)
          setTeacherMetrics(null)
        }
      }
    }

    void loadTeacherData()

    return () => controller.abort()
  }, [])

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-pk-border bg-gradient-to-br from-white via-white to-teal-50/80 shadow-hero">
        <div className="grid gap-10 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-10 lg:py-10">
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <p className="pk-eyebrow">Peskids · Profesores</p>
              <Badge tone="violet">Panel docente</Badge>
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-pk-ink sm:text-4xl lg:text-[3.9rem]">
              Tu agenda docente, con clases, asistencia y seguimiento académico en una sola portada.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-pk-sub sm:text-lg">
              Esta vista prioriza lo que un profesor necesita ver al abrir el panel: agenda,
              grupos, observaciones, entregas y comunicación con familias sin saltar entre pantallas.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button type="button" onClick={() => (window.location.href = '/teacher/submissions')}>
                Ver entregas
              </Button>
              <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
                Actualizar agenda
              </Button>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-4 md:grid-cols-4">
              {responseCards.map((card) => (
                <div key={card.title} className="rounded-2xl border border-pk-border bg-white/90 p-4 shadow-card">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-pk-mutedText">
                    {card.title}
                  </p>
                  <p className="mt-1 text-2xl font-semibold text-pk-ink">{card.value}</p>
                  <p className="mt-1 text-sm text-pk-sub">{card.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <TeacherCalendarShowcase />
          </div>
        </div>
      </section>

      <GrowthWidget
        eyebrow="Progreso del grupo"
        title="Constancia, avances y cierres del aula"
        description="Una lectura rápida de qué va bien, qué necesita revisión y qué está listo para cerrar esta semana."
        mission="Guiar cada clase con orden y paciencia para que el grupo avance con confianza."
        vision="Un aula donde cada alumno progresa y cada familia recibe claridad a tiempo."
        objectives={['Asistencia completa', 'Observaciones cerradas', 'Entregas revisadas']}
        achievements={['Clase ordenada', '5 días de racha', 'Seguimiento al día']}
        streakLabel="Racha docente activa"
        streakValue="12"
        progressLabel="Avance semanal del grupo"
        progressPercent={78}
        accent="violet"
        className="mt-6"
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-pk-primary" aria-hidden />
              Clases de hoy
            </CardTitle>
            <CardDescription>Lo que toca revisar antes de terminar el día.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {todayAgenda.map((slot) => (
              <div key={`${slot.day}-${slot.time}`} className="rounded-2xl border border-pk-border bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-pk-ink">{slot.className}</p>
                      <Badge tone={slot.status === 'ongoing' ? 'amber' : 'teal'}>
                        {slot.status === 'ongoing' ? 'En curso' : slot.status === 'done' ? 'Hecha' : 'Agenda'}
                      </Badge>
                    </div>
                    <p className="text-xs text-pk-sub">
                      {slot.day} · {slot.time} · {slot.students} estudiantes
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="secondary">
                    <CheckCircle2 className="h-4 w-4" aria-hidden />
                    <span className="ml-1">Asistencia</span>
                  </Button>
                  <Button type="button" size="sm" variant="ghost">
                    <PencilLine className="h-4 w-4" aria-hidden />
                    <span className="ml-1">Nota</span>
                  </Button>
                  <Button type="button" size="sm" variant="ghost">
                    <RotateCcw className="h-4 w-4" aria-hidden />
                    <span className="ml-1">Reagendar</span>
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-pk-primary" aria-hidden />
              Observaciones del grupo
            </CardTitle>
            <CardDescription>Notas cortas para seguimiento pedagógico sin salir del panel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {teacherNotes.map((note) => (
              <div key={note.id} className="rounded-2xl border border-pk-border bg-pk-muted/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-pk-ink">{note.student}</p>
                    <p className="text-xs text-pk-sub">{note.className}</p>
                  </div>
                  <Badge tone={note.priority === 'alta' ? 'amber' : note.priority === 'media' ? 'violet' : 'green'}>
                    {note.priority}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-pk-sub">{note.note}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Acciones de clase</CardTitle>
            <CardDescription>Lo esencial para cerrar el día con orden.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button type="button" className="w-full justify-start" variant="secondary">
              Registrar asistencia
            </Button>
            <Button type="button" className="w-full justify-start" variant="ghost">
              Añadir observación
            </Button>
            <Button type="button" className="w-full justify-start" variant="ghost">
              Revisar mensajes de familias
            </Button>
            <Button type="button" className="w-full justify-start" variant="ghost">
              Ver planificación semanal
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="rounded-3xl border border-pk-border bg-white p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
              Entregas del aula
            </p>
            <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-pk-ink">
              Entregas y comentarios listos para revisar.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-pk-sub">
              Esta capa muestra entregas reales de estudiantes para revisar, calificar y devolver
              sin salir del flujo docente.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                window.location.href = '/teacher/submissions'
              }}
            >
              Ver entregas
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                window.location.reload()
              }}
            >
              Actualizar
            </Button>
          </div>
        </div>

        <div className="mt-5">
          {teacherDataError ? (
            <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-pk-border bg-pk-muted/25 p-6 text-center">
              <p className="text-sm font-medium text-pk-ink">No se pudo cargar el aula</p>
              <p className="max-w-md text-sm text-pk-sub">{teacherDataError}</p>
            </div>
          ) : isLoadingTeacherData ? (
            <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-pk-border bg-pk-muted/25">
              <div className="flex items-center gap-2 text-sm text-pk-sub">
                <Loader2 className="h-4 w-4 animate-spin text-pk-primary" aria-hidden />
                Cargando entregas del aula
              </div>
            </div>
          ) : (
            <TeacherDashboard
              submissions={teacherData?.submissions ?? []}
              isLoading={false}
              onReviewSubmission={() => {
                window.location.href = '/teacher/submissions'
              }}
            />
          )}
        </div>
      </section>
    </div>
  )
}
