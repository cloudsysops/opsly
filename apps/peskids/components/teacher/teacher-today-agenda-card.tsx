'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, ClipboardList, PencilLine, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AttendanceStatus } from '@/lib/class-types';
import type { DaySlot } from './teacher-dashboard-types';

function slotStatusLabel(status: DaySlot['status']): string {
  if (status === 'ongoing') return 'En curso';
  if (status === 'done') return 'Hecha';
  return 'Agenda';
}

interface TeacherTodayAgendaCardProps {
  slots: readonly DaySlot[];
  attendanceFocusClassId?: string | null;
  noteFocusClassId?: string | null;
  onAttendanceFocusHandled?: () => void;
  onNoteFocusHandled?: () => void;
}

interface EnrollmentItem {
  id: string;
  student_name?: string;
  parent_email?: string | null;
  attendance: AttendanceStatus | null;
}

interface ClassEnrollmentsResponse {
  enrollments?: EnrollmentItem[];
}

const attendanceOptions: ReadonlyArray<{
  label: string;
  value: AttendanceStatus;
  tone: 'green' | 'amber' | 'violet';
}> = [
    { label: 'Presente', value: 'present', tone: 'green' },
    { label: 'Ausente', value: 'absent', tone: 'amber' },
    { label: 'Excusado', value: 'excused', tone: 'violet' },
  ];

function parseLocalDateTimeInput(value: string): Date | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function TeacherTodayAgendaCard({
  slots,
  attendanceFocusClassId,
  noteFocusClassId,
  onAttendanceFocusHandled,
  onNoteFocusHandled,
}: TeacherTodayAgendaCardProps): React.ReactElement {
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);
  const [enrollmentsByClass, setEnrollmentsByClass] = useState<Record<string, EnrollmentItem[]>>({});
  const [draftAttendance, setDraftAttendance] = useState<
    Record<string, Record<string, AttendanceStatus | null>>
  >({});
  const [loadingClassId, setLoadingClassId] = useState<string | null>(null);
  const [savingClassId, setSavingClassId] = useState<string | null>(null);
  const [messageByClass, setMessageByClass] = useState<Record<string, string>>({});

  const handleOpenAttendance = async (slot: DaySlot): Promise<void> => {
    if (expandedClassId === slot.classId) {
      setExpandedClassId(null);
      return;
    }

    setExpandedClassId(slot.classId);
    setMessageByClass((current) => ({ ...current, [slot.classId]: '' }));

    if (enrollmentsByClass[slot.classId]) {
      return;
    }

    try {
      setLoadingClassId(slot.classId);
      const response = await fetch(`/api/admin/classes/${slot.classId}/enrollments`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(`Attendance load failed with ${response.status}`);
      }

      const payload = (await response.json()) as ClassEnrollmentsResponse;
      const enrollments = payload.enrollments ?? [];

      setEnrollmentsByClass((current) => ({
        ...current,
        [slot.classId]: enrollments,
      }));
      setDraftAttendance((current) => ({
        ...current,
        [slot.classId]: Object.fromEntries(
          enrollments.map((enrollment) => [enrollment.id, enrollment.attendance ?? null])
        ),
      }));
    } catch {
      setMessageByClass((current) => ({
        ...current,
        [slot.classId]: 'No se pudo cargar la asistencia de esta clase.',
      }));
    } finally {
      setLoadingClassId(null);
    }
  };

  const handleAttendanceChange = (
    classId: string,
    enrollmentId: string,
    attendance: AttendanceStatus
  ): void => {
    setDraftAttendance((current) => ({
      ...current,
      [classId]: {
        ...current[classId],
        [enrollmentId]: attendance,
      },
    }));
  };

  const handleSaveAttendance = async (classId: string): Promise<void> => {
    const classDraft = draftAttendance[classId];
    if (!classDraft) {
      return;
    }

    const updates = Object.entries(classDraft)
      .filter((entry): entry is [string, AttendanceStatus] => entry[1] !== null)
      .map(([enrollmentId, attendance]) => ({
        enrollment_id: enrollmentId,
        attendance,
      }));

    if (updates.length === 0) {
      setMessageByClass((current) => ({
        ...current,
        [classId]: 'Marca al menos una asistencia antes de guardar.',
      }));
      return;
    }

    try {
      setSavingClassId(classId);
      const response = await fetch(`/api/admin/classes/${classId}/attendance`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        throw new Error(`Attendance save failed with ${response.status}`);
      }

      setEnrollmentsByClass((current) => ({
        ...current,
        [classId]: (current[classId] ?? []).map((enrollment) => ({
          ...enrollment,
          attendance: classDraft[enrollment.id] ?? enrollment.attendance,
        })),
      }));
      setMessageByClass((current) => ({
        ...current,
        [classId]: 'Asistencia guardada correctamente.',
      }));
    } catch {
      setMessageByClass((current) => ({
        ...current,
        [classId]: 'No se pudo guardar la asistencia.',
      }));
    } finally {
      setSavingClassId(null);
    }
  };

  const handleSaveClassNote = async (slot: DaySlot): Promise<void> => {
    const note = window.prompt('Nota de clase (máx. 500 caracteres)');
    if (!note?.trim()) {
      return;
    }

    try {
      setSavingClassId(slot.classId);
      const response = await fetch(`/api/admin/classes/${slot.classId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_notes: note.trim().slice(0, 500) }),
      });

      if (!response.ok) {
        throw new Error(`Class note save failed with ${response.status}`);
      }

      setMessageByClass((current) => ({
        ...current,
        [slot.classId]: 'Nota de clase guardada.',
      }));
    } catch {
      setMessageByClass((current) => ({
        ...current,
        [slot.classId]: 'No se pudo guardar la nota de clase.',
      }));
    } finally {
      setSavingClassId(null);
    }
  };

  const handleReschedule = async (slot: DaySlot): Promise<void> => {
    const defaultValue = slot.startsAt.slice(0, 16);
    const input = window.prompt(
      'Nueva fecha y hora de inicio (AAAA-MM-DDTHH:mm)',
      defaultValue
    );
    if (!input?.trim()) {
      return;
    }

    const newStart = parseLocalDateTimeInput(input);
    if (!newStart) {
      setMessageByClass((current) => ({
        ...current,
        [slot.classId]: 'Formato de fecha inválido.',
      }));
      return;
    }

    try {
      setSavingClassId(slot.classId);
      const response = await fetch(`/api/admin/classes/${slot.classId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ starts_at: newStart.toISOString() }),
      });

      if (!response.ok) {
        throw new Error(`Reschedule failed with ${response.status}`);
      }

      setMessageByClass((current) => ({
        ...current,
        [slot.classId]: 'Clase reagendada. Actualiza la página para ver la nueva hora.',
      }));
    } catch {
      setMessageByClass((current) => ({
        ...current,
        [slot.classId]: 'No se pudo reagendar la clase.',
      }));
    } finally {
      setSavingClassId(null);
    }
  };

  useEffect(() => {
    if (!attendanceFocusClassId) {
      return;
    }
    const slot = slots.find((item) => item.classId === attendanceFocusClassId);
    if (!slot) {
      onAttendanceFocusHandled?.();
      return;
    }
    void handleOpenAttendance(slot).finally(() => {
      onAttendanceFocusHandled?.();
    });
  }, [attendanceFocusClassId, slots, onAttendanceFocusHandled]);

  useEffect(() => {
    if (!noteFocusClassId) {
      return;
    }
    const slot = slots.find((item) => item.classId === noteFocusClassId);
    if (!slot) {
      onNoteFocusHandled?.();
      return;
    }
    void handleSaveClassNote(slot).finally(() => {
      onNoteFocusHandled?.();
    });
  }, [noteFocusClassId, slots, onNoteFocusHandled]);

  return (
    <Card id="teacher-today-agenda" className="xl:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-pk-primary" aria-hidden />
          Clases de hoy
        </CardTitle>
        <CardDescription>Lo que toca revisar antes de terminar el dia.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {slots.length === 0 ? (
          <p className="text-sm text-pk-sub">No hay clases programadas para hoy.</p>
        ) : null}
        {slots.map((slot) => (
          <div
            key={slot.classId}
            className="rounded-2xl border border-pk-border bg-white p-4"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-pk-ink">{slot.className}</p>
                  <Badge tone={slot.status === 'ongoing' ? 'amber' : 'teal'}>
                    {slotStatusLabel(slot.status)}
                  </Badge>
                </div>
                <p className="text-xs text-pk-sub">
                  {slot.day} · {slot.time} · {slot.students} estudiantes
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  void handleOpenAttendance(slot);
                }}
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden />
                <span className="ml-1">
                  {expandedClassId === slot.classId ? 'Cerrar asistencia' : 'Asistencia'}
                </span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={savingClassId === slot.classId}
                onClick={() => {
                  void handleSaveClassNote(slot);
                }}
              >
                <PencilLine className="h-4 w-4" aria-hidden />
                <span className="ml-1">Nota</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={savingClassId === slot.classId}
                onClick={() => {
                  void handleReschedule(slot);
                }}
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                <span className="ml-1">Reagendar</span>
              </Button>
            </div>
            {expandedClassId === slot.classId ? (
              <div className="mt-4 rounded-2xl border border-pk-border bg-pk-snow p-4">
                {loadingClassId === slot.classId ? (
                  <p className="text-sm text-pk-sub">Cargando alumnos de la clase...</p>
                ) : null}

                {!loadingClassId && (enrollmentsByClass[slot.classId]?.length ?? 0) === 0 ? (
                  <p className="text-sm text-pk-sub">
                    No hay estudiantes inscritos visibles para esta clase.
                  </p>
                ) : null}

                <div className="space-y-3">
                  {(enrollmentsByClass[slot.classId] ?? []).map((enrollment) => {
                    const currentAttendance =
                      draftAttendance[slot.classId]?.[enrollment.id] ?? enrollment.attendance;

                    return (
                      <div
                        key={enrollment.id}
                        className="rounded-2xl border border-pk-border bg-white p-3"
                      >
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <p className="text-sm font-semibold text-pk-ink">
                              {enrollment.student_name ?? 'Alumno sin nombre'}
                            </p>
                            <p className="text-xs text-pk-sub">
                              {enrollment.parent_email ?? 'Sin correo de familia'}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {attendanceOptions.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${currentAttendance === option.value
                                    ? 'border-pk-primary bg-white text-pk-ink'
                                    : 'border-pk-border bg-pk-snow text-pk-sub hover:border-pk-primary/40'
                                  }`}
                                onClick={() =>
                                  handleAttendanceChange(slot.classId, enrollment.id, option.value)
                                }
                              >
                                <span>{option.label}</span>
                                {currentAttendance === option.value ? (
                                  <Badge className="ml-2" tone={option.tone}>
                                    Activo
                                  </Badge>
                                ) : null}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {messageByClass[slot.classId] ? (
                  <p
                    className={`mt-3 text-sm ${messageByClass[slot.classId]?.includes('correctamente') ||
                        messageByClass[slot.classId]?.includes('guardada') ||
                        messageByClass[slot.classId]?.includes('reagendada')
                        ? 'text-emerald-700'
                        : 'text-pk-danger'
                      }`}
                    role="alert"
                  >
                    {messageByClass[slot.classId]}
                  </p>
                ) : null}

                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      void handleSaveAttendance(slot.classId);
                    }}
                    disabled={savingClassId === slot.classId || loadingClassId === slot.classId}
                  >
                    {savingClassId === slot.classId ? 'Guardando...' : 'Guardar asistencia'}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
