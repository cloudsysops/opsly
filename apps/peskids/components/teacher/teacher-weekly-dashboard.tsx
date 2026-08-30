'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TeacherSubmissionsSection,
  type TeacherSubmissionsResponse,
} from './teacher-submissions-section';
import { TeacherNotesActionsPanel, type TeacherActionNote } from './teacher-notes-actions-panel';
import { TeacherTodayAgendaCard } from './teacher-today-agenda-card';
import { TeacherWeeklyOverview } from './teacher-weekly-overview';
import type { AgendaItem } from '@/lib/class-types';
import type { DaySlot, TeacherDashboardCard } from './teacher-dashboard-types';
import { filterTodayAgendaSlots, mapAgendaItemsToAgendaSlots } from '@/lib/teacher-agenda';

interface AgendaApiResponse {
  agenda?: AgendaItem[];
  error?: string;
}

export function TeacherWeeklyDashboard(): React.ReactElement {
  const router = useRouter();
  const [teacherData, setTeacherData] = useState<TeacherSubmissionsResponse | null>(null);
  const [isLoadingTeacherData, setIsLoadingTeacherData] = useState(true);
  const [teacherDataError, setTeacherDataError] = useState<string | null>(null);
  const [agendaSlots, setAgendaSlots] = useState<readonly DaySlot[]>([]);
  const [agendaSource, setAgendaSource] = useState<'live' | 'empty'>('empty');
  const [attendanceFocusClassId, setAttendanceFocusClassId] = useState<string | null>(null);
  const [noteFocusClassId, setNoteFocusClassId] = useState<string | null>(null);

  const todayAgenda = useMemo(() => filterTodayAgendaSlots([...agendaSlots]), [agendaSlots]);

  const responseCards = useMemo<readonly TeacherDashboardCard[]>(() => {
    const totalResponses = teacherData?.submissions.length ?? 0;
    const needsAttention =
      (teacherData?.stats.pendingCount ?? 0) + (teacherData?.stats.needsRevisionCount ?? 0);
    const todayClasses = todayAgenda.length;
    const totalStudentsToday = todayAgenda.reduce((sum, slot) => sum + slot.students, 0);
    const reviewProgressPct =
      totalResponses > 0
        ? Math.round(((teacherData?.stats.reviewedCount ?? 0) / totalResponses) * 100)
        : 0;

    return [
      {
        title: 'Hoy',
        description: 'Clases activas en la agenda',
        value: String(todayClasses),
        tone: 'teal',
      },
      {
        title: 'Estudiantes',
        description: 'Carga total del día',
        value: String(totalStudentsToday),
        tone: 'green',
      },
      {
        title: 'Entregas',
        description: 'Respuestas del aula',
        value: String(totalResponses),
        tone: 'violet',
      },
      {
        title: 'Seguimiento',
        description: `${reviewProgressPct}% revisado · pendientes hoy`,
        value: String(needsAttention),
        tone: 'amber',
      },
    ] as const;
  }, [teacherData, todayAgenda]);

  const teacherNotes = useMemo<readonly TeacherActionNote[]>(() => {
    const notes: TeacherActionNote[] = [];

    for (const submission of teacherData?.submissions.slice(0, 5) ?? []) {
      if (submission.status === 'reviewed') {
        continue;
      }
      notes.push({
        id: submission.submissionId,
        student: submission.studentName,
        className: submission.formTitle,
        note:
          submission.status === 'needs_revision'
            ? 'Requiere revisión y observación antes del siguiente bloque.'
            : 'Entrega pendiente de revisión para cerrar el seguimiento del aula.',
        priority: submission.status === 'needs_revision' ? 'alta' : 'media',
      });
    }

    if (notes.length === 0 && todayAgenda.length > 0) {
      return todayAgenda.slice(0, 3).map((slot, index) => ({
        id: `agenda-${slot.classId}-${index}`,
        student: 'Grupo del día',
        className: slot.className,
        note: `Clase programada con ${slot.students} estudiantes. Confirmar asistencia y cierre.`,
        priority: slot.status === 'ongoing' ? 'alta' : 'baja',
      }));
    }

    return notes;
  }, [teacherData, todayAgenda]);

  const agendaPreview = useMemo(() => agendaSlots.slice(0, 4), [agendaSlots]);
  const progressPercent = useMemo(() => {
    const totalResponses = teacherData?.submissions.length ?? 0;
    if (totalResponses === 0) {
      return agendaSlots.length > 0 ? 55 : 0;
    }
    return Math.max(
      0,
      Math.min(100, Math.round(((teacherData?.stats.reviewedCount ?? 0) / totalResponses) * 100))
    );
  }, [agendaSlots.length, teacherData]);
  const streakValue = useMemo(
    () => String(Math.max(agendaSlots.length, teacherData?.stats.reviewedCount ?? 0)),
    [agendaSlots.length, teacherData]
  );

  useEffect(() => {
    const controller = new AbortController();

    const loadTeacherData = async (): Promise<void> => {
      try {
        setIsLoadingTeacherData(true);
        setTeacherDataError(null);

        const response = await fetch('/api/submissions/teacher', {
          credentials: 'include',
          signal: controller.signal,
        });

        if (response.status === 401 || response.status === 403) {
          if (!controller.signal.aborted) {
            router.replace('/teacher/login');
          }
          return;
        }

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
  }, [router]);

  useEffect(() => {
    const controller = new AbortController();
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + 7);

    const loadAgenda = async (): Promise<void> => {
      try {
        const params = new URLSearchParams({
          from: from.toISOString(),
          to: to.toISOString(),
        });
        const response = await fetch(`/api/admin/agenda?${params.toString()}`, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          setAgendaSlots([]);
          setAgendaSource('empty');
          return;
        }

        const payload = (await response.json()) as AgendaApiResponse;
        if (controller.signal.aborted) {
          return;
        }

        if (!payload.agenda?.length) {
          setAgendaSlots([]);
          setAgendaSource('empty');
          return;
        }

        setAgendaSlots(mapAgendaItemsToAgendaSlots(payload.agenda));
        setAgendaSource('live');
      } catch {
        if (!controller.signal.aborted) {
          setAgendaSlots([]);
          setAgendaSource('empty');
        }
      }
    };

    void loadAgenda();

    return () => controller.abort();
  }, []);

  const focusFirstTodayClass = (): string | null => todayAgenda[0]?.classId ?? null;

  return (
    <div className="space-y-6">
      <TeacherWeeklyOverview
        responseCards={responseCards}
        agendaPreview={agendaPreview}
        agendaSource={agendaSource}
        progressPercent={progressPercent}
        streakValue={streakValue}
        onViewSubmissions={() => {
          window.location.href = '/teacher/submissions';
        }}
        onRefreshAgenda={() => {
          window.location.reload();
        }}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <TeacherTodayAgendaCard
          slots={todayAgenda}
          attendanceFocusClassId={attendanceFocusClassId}
          noteFocusClassId={noteFocusClassId}
          onAttendanceFocusHandled={() => setAttendanceFocusClassId(null)}
          onNoteFocusHandled={() => setNoteFocusClassId(null)}
        />
        <TeacherNotesActionsPanel
          notes={teacherNotes}
          onMarkAttendance={() => {
            const classId = focusFirstTodayClass();
            if (!classId) {
              return;
            }
            document.getElementById('teacher-today-agenda')?.scrollIntoView({ behavior: 'smooth' });
            setAttendanceFocusClassId(classId);
          }}
          onAddClassNote={() => {
            const classId = focusFirstTodayClass();
            if (!classId) {
              return;
            }
            document.getElementById('teacher-today-agenda')?.scrollIntoView({ behavior: 'smooth' });
            setNoteFocusClassId(classId);
          }}
          onReviewFamilyFeedback={() => {
            window.location.href = '/teacher/submissions';
          }}
          onViewWeekAgenda={() => {
            window.location.reload();
          }}
        />
      </div>

      <TeacherSubmissionsSection
        data={teacherData}
        isLoading={isLoadingTeacherData}
        error={teacherDataError}
      />
    </div>
  );
}
