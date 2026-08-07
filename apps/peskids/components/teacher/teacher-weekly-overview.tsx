'use client';

import { CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GrowthWidget } from '@/components/progress/growth-widget';
import type { DaySlot, TeacherDashboardCard } from './teacher-dashboard-types';

function statusLabel(status: DaySlot['status']): string {
  if (status === 'ongoing') return 'En curso';
  if (status === 'done') return 'Hecha';
  return 'Agenda';
}

interface TeacherWeeklyOverviewProps {
  responseCards: readonly TeacherDashboardCard[];
  agendaPreview: readonly DaySlot[];
  agendaSource: 'live' | 'empty';
  progressPercent: number;
  streakValue: string;
  onViewSubmissions: () => void;
  onRefreshAgenda: () => void;
}

export function TeacherWeeklyOverview({
  responseCards,
  agendaPreview,
  agendaSource,
  progressPercent,
  streakValue,
  onViewSubmissions,
  onRefreshAgenda,
}: TeacherWeeklyOverviewProps): React.ReactElement {
  return (
    <>
      <section className="overflow-hidden rounded-[2rem] border border-pk-border bg-gradient-to-br from-white via-white to-teal-50/80 shadow-hero">
        <div className="grid gap-10 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-10 lg:py-10">
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <p className="pk-eyebrow">Peskids · Mission Control · Profesores</p>
              <Badge tone="violet">Sierra · profesor principal</Badge>
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-pk-ink sm:text-4xl lg:text-[3.9rem]">
              Todo tu dia de clases, con calendario, seguimiento y feedback en una sola portada.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-pk-sub sm:text-lg">
              Esta vista prioriza lo que un profesor principal necesita ver al abrir el panel:
              agenda, grupos, observaciones, entregas y respuestas de familias sin saltar entre
              pantallas.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button type="button" onClick={onViewSubmissions}>
                Ver entregas
              </Button>
              <Button type="button" variant="secondary" onClick={onRefreshAgenda}>
                Actualizar agenda
              </Button>
            </div>

            <div className="mt-10 grid max-w-2xl grid-cols-2 gap-4 md:grid-cols-4">
              {responseCards.map((card) => (
                <div
                  key={card.title}
                  className="rounded-2xl border border-pk-border bg-white/90 p-4 shadow-card"
                >
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
            <div className="overflow-hidden rounded-[2rem] border border-pk-border bg-white shadow-hero">
              <div className="flex items-center justify-between gap-4 border-b border-pk-border bg-pk-snow px-5 py-4">
                <div>
                  <p className="font-bold text-pk-ink">Agenda del profesor</p>
                  <p className="text-xs text-pk-mutedText">
                    {agendaSource === 'live'
                      ? 'Lectura real de clases programadas'
                      : 'Sin clases activas cargadas en este rango'}
                  </p>
                </div>
                <div className="rounded-full border border-pk-border bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-pk-mutedText">
                  {agendaSource === 'live' ? 'Live' : 'Pendiente'}
                </div>
              </div>

              <div className="p-5">
                {agendaPreview.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-pk-border bg-pk-snow px-4 py-8 text-center text-sm text-pk-sub">
                    No hay clases próximas visibles para este profesor.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {agendaPreview.map((slot) => (
                      <div
                        key={`${slot.classId}-${slot.startsAt}`}
                        className="rounded-2xl border border-pk-border bg-pk-snow px-4 py-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <CalendarClock className="h-4 w-4 text-pk-primary" aria-hidden />
                              <p className="text-sm font-bold text-pk-ink">{slot.className}</p>
                            </div>
                            <p className="mt-1 text-xs text-pk-sub">
                              {slot.day} · {slot.time} · {slot.students} estudiantes
                            </p>
                          </div>
                          <Badge tone={slot.status === 'ongoing' ? 'amber' : 'teal'}>
                            {statusLabel(slot.status)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <GrowthWidget
        eyebrow="Progreso del equipo"
        title="Metas, constancia y logros del aula"
        description="Una lectura rapida de que esta avanzando bien, que requiere cierre y que gana terreno cada semana."
        mission="Guiar cada clase con orden, paciencia y seguimiento para que el grupo avance sin friccion."
        vision="Un aula donde cada alumno progresa con confianza y cada familia recibe claridad a tiempo."
        objectives={['Asistencia completa', 'Feedback enviado', 'Observaciones cerradas']}
        achievements={['Agenda sincronizada', 'Entregas visibles', 'Familias con seguimiento']}
        streakLabel="Racha activa del profesor"
        streakValue={streakValue}
        progressLabel="Avance semanal del aula"
        progressPercent={progressPercent}
        accent="violet"
        className="mt-6"
      />
    </>
  );
}
