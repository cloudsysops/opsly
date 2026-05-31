'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  TeacherSubmissionsSection,
  type TeacherSubmissionsResponse,
} from './teacher-submissions-section';
import { TeacherNotesActionsPanel } from './teacher-notes-actions-panel';
import { TeacherTodayAgendaCard } from './teacher-today-agenda-card';
import { TeacherWeeklyOverview } from './teacher-weekly-overview';
import { baseTeacherCards, teacherNotes, weeklyAgenda } from './teacher-weekly-static-data';
import type { ClassListItem } from '@/lib/class-types';
import type { DaySlot } from './teacher-weekly-static-data';
import { filterTodayAgendaSlots, mapClassesToAgendaSlots } from '@/lib/teacher-agenda';

interface ClassesApiResponse {
  classes?: ClassListItem[];
  error?: string;
}

export function TeacherWeeklyDashboard(): React.ReactElement {
  const [teacherData, setTeacherData] = useState<TeacherSubmissionsResponse | null>(null);
  const [isLoadingTeacherData, setIsLoadingTeacherData] = useState(true);
  const [teacherDataError, setTeacherDataError] = useState<string | null>(null);
  const [agendaSlots, setAgendaSlots] = useState<readonly DaySlot[]>(weeklyAgenda);
  const [agendaSource, setAgendaSource] = useState<'live' | 'static'>('static');

  const todayAgenda = useMemo(
    () =>
      agendaSource === 'live'
        ? filterTodayAgendaSlots([...agendaSlots])
        : agendaSlots.filter((slot) => slot.day === 'Mié' || slot.status !== 'done'),
    [agendaSlots, agendaSource]
  );

  const responseCards = useMemo(() => {
    if (!teacherData) {
      return baseTeacherCards;
    }

    const totalResponses = teacherData.submissions.length;
    const needsAttention = teacherData.stats.pendingCount + teacherData.stats.needsRevisionCount;

    return [
      baseTeacherCards[0],
      baseTeacherCards[1],
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
          status: 'scheduled',
        });
        const response = await fetch(`/api/admin/classes?${params.toString()}`, {
          credentials: 'include',
          signal: controller.signal,
        });

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as ClassesApiResponse;
        if (controller.signal.aborted || !payload.classes?.length) {
          return;
        }

        setAgendaSlots(mapClassesToAgendaSlots(payload.classes));
        setAgendaSource('live');
      } catch {
        // Keep static demo agenda when operations tables or session are unavailable.
      }
    };

    void loadAgenda();

    return () => controller.abort();
  }, []);

  return (
    <div className="space-y-6">
      <TeacherWeeklyOverview
        responseCards={responseCards}
        onViewSubmissions={() => {
          window.location.href = '/teacher/submissions';
        }}
        onRefreshAgenda={() => {
          window.location.reload();
        }}
      />

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <TeacherTodayAgendaCard slots={todayAgenda} />
        <TeacherNotesActionsPanel notes={teacherNotes} />
      </div>

      <TeacherSubmissionsSection
        data={teacherData}
        isLoading={isLoadingTeacherData}
        error={teacherDataError}
      />
    </div>
  );
}
