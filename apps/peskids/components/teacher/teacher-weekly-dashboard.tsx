'use client';

import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, MessageSquare, PencilLine, RotateCcw, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GrowthWidget } from '@/components/progress/growth-widget';
import { TeacherCalendarShowcase } from './teacher-calendar-showcase';
import {
  TeacherSubmissionsSection,
  type TeacherSubmissionsResponse,
} from './teacher-submissions-section';

type DaySlot = {
  day: string;
  time: string;
  className: string;
  students: number;
  status: 'scheduled' | 'ongoing' | 'done';
};

type TeacherNote = {
  id: string;
  student: string;
  className: string;
  note: string;
  priority: 'alta' | 'media' | 'baja';
};

const weeklyAgenda: DaySlot[] = [
  { day: 'Lun', time: '07:00', className: 'Grupo Iniciación', students: 8, status: 'done' },
  { day: 'Mar', time: '16:00', className: 'Técnica Junior', students: 10, status: 'scheduled' },
  { day: 'Mié', time: '07:00', className: 'Grupo Iniciación', students: 8, status: 'ongoing' },
  { day: 'Jue', time: '16:00', className: 'Avanzado', students: 6, status: 'scheduled' },
  {
    day: 'Vie',
    time: '07:00',
    className: 'Seguimiento familiar',
    students: 5,
    status: 'scheduled',
  },
];

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
];

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
    title: 'Mensajes',
    description: 'Familias esperando respuesta',
    value: '4',
    tone: 'violet',
  },
] as const;

export function TeacherWeeklyDashboard(): React.ReactElement {
  const [teacherData, setTeacherData] = useState<TeacherSubmissionsResponse | null>(null);
  const [isLoadingTeacherData, setIsLoadingTeacherData] = useState(true);
  const [teacherDataError, setTeacherDataError] = useState<string | null>(null);

  const todayAgenda = useMemo(
    () => weeklyAgenda.filter((slot) => slot.day === 'Mié' || slot.status !== 'done'),
    []
  );

  const responseCards = useMemo(() => {
    if (!teacherData) {
      return classCards;
    }

    const totalResponses = teacherData.submissions.length;
    const needsAttention = teacherData.stats.pendingCount + teacherData.stats.needsRevisionCount;

    return [
      classCards[0],
      classCards[1],
      {
        title: 'Respuestas',
        description: 'Subidas por estudiantes en el aula',
        value: String(totalResponses),
        tone: 'violet',
      },
      {
        title: 'Pendientes',
        description: 'Requieren seguimiento hoy',
        value: String(needsAttention),
        tone: 'amber',
      },
    ] as const;
  }, [teacherData]);

  useEffect(() => {
    const controller = new AbortController();

    const loadTeacherData = async (): Promise<void> => {
      try {
        setIsLoadingTeacherData(true);
        setTeacherDataError(null);

        const response = await fetch('/api/submissions/teacher', {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Teacher submissions request failed with ${response.status}`);
        }

        const payload = (await response.json()) as TeacherSubmissionsResponse;
        if (!controller.signal.aborted) {
          setTeacherData(payload);
        }
      } catch (error_) {
        if (!controller.signal.aborted) {
          const message =
            error_ instanceof Error ? error_.message : 'No se pudieron cargar las respuestas.';
          setTeacherDataError(message);
          setTeacherData(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingTeacherData(false);
        }
      }
    };

    void loadTeacherData();

    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[2rem] border border-pk-border bg-gradient-to-br from-white via-white to-teal-50/80 shadow-hero">
        <div className="grid gap-10 px-5 py-6 sm:px-8 sm:py-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-center lg:px-10 lg:py-10">
          <div className="relative z-10">
            <div className="flex flex-wrap items-center gap-2">
              <p className="pk-eyebrow">Peskids · Profesores</p>
              <Badge tone="violet">Sierra · profesor principal</Badge>
            </div>
            <h1 className="mt-4 max-w-2xl text-3xl font-bold tracking-tight text-pk-ink sm:text-4xl lg:text-[3.9rem]">
              Todo tu día de clases, con calendario, seguimiento y feedback en una sola portada.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-pk-sub sm:text-lg">
              Esta vista prioriza lo que un profesor principal necesita ver al abrir el panel:
              agenda, grupos, observaciones, entregas y respuestas de familias sin saltar entre
              pantallas.
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
            <TeacherCalendarShowcase />
          </div>
        </div>
      </section>

      <GrowthWidget
        eyebrow="Progreso del equipo"
        title="Metas, constancia y logros del aula"
        description="Una lectura rápida de qué está avanzando bien, qué requiere cierre y qué gana terreno cada semana."
        mission="Guiar cada clase con orden, paciencia y seguimiento para que el grupo avance sin fricción."
        vision="Un aula donde cada alumno progresa con confianza y cada familia recibe claridad a tiempo."
        objectives={['Asistencia completa', 'Feedback enviado', 'Observaciones cerradas']}
        achievements={['Clase impecable', '5 días de racha', 'Familias al día']}
        streakLabel="Racha activa del profesor"
        streakValue="12"
        progressLabel="Avance semanal del aula"
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
              <div
                key={`${slot.day}-${slot.time}`}
                className="rounded-2xl border border-pk-border bg-white p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-pk-ink">{slot.className}</p>
                      <Badge tone={slot.status === 'ongoing' ? 'amber' : 'teal'}>
                        {slot.status === 'ongoing'
                          ? 'En curso'
                          : slot.status === 'done'
                            ? 'Hecha'
                            : 'Agenda'}
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
              Observaciones y feedback
            </CardTitle>
            <CardDescription>
              Notas cortas para dar seguimiento sin abrir otra herramienta.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {teacherNotes.map((note) => (
              <div key={note.id} className="rounded-2xl border border-pk-border bg-pk-muted/35 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-pk-ink">{note.student}</p>
                    <p className="text-xs text-pk-sub">{note.className}</p>
                  </div>
                  <Badge
                    tone={
                      note.priority === 'alta'
                        ? 'amber'
                        : note.priority === 'media'
                          ? 'violet'
                          : 'green'
                    }
                  >
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
            <CardTitle className="text-base">Acciones rápidas</CardTitle>
            <CardDescription>Trabajo del día en una sola vista.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button type="button" className="w-full justify-start" variant="secondary">
              Marcar asistencia
            </Button>
            <Button type="button" className="w-full justify-start" variant="ghost">
              Registrar nota de clase
            </Button>
            <Button type="button" className="w-full justify-start" variant="ghost">
              Revisar feedback familiar
            </Button>
            <Button type="button" className="w-full justify-start" variant="ghost">
              Ver agenda de la semana
            </Button>
          </CardContent>
        </Card>
      </div>

      <TeacherSubmissionsSection
        data={teacherData}
        isLoading={isLoadingTeacherData}
        error={teacherDataError}
      />
    </div>
  );
}
