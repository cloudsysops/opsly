'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Loader2, RefreshCw, Send, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Student = {
  id: string;
  name: string;
  grade: string | null;
  status: string;
};

type Mission = {
  id: string;
  slug: string;
  title: string;
  description: string;
  skill: string;
  safety_level: 'dry_land_safe' | 'human_review_required';
  active: boolean;
  version: number;
};

type Assignment = {
  id: string;
  student_id: string;
  mission_id: string;
  status: string;
  assigned_by_type: string;
  assignment_mode: string;
  reason: string | null;
  created_at: string;
};

export function SwimMissionAssignmentConsole(): React.ReactElement {
  const [students, setStudents] = useState<Student[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [studentId, setStudentId] = useState('');
  const [missionSlug, setMissionSlug] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState('');

  const selectedStudent = useMemo(
    () => students.find((student) => student.id === studentId) ?? null,
    [studentId, students]
  );

  async function loadBase(): Promise<void> {
    setLoading(true);
    setFeedback('');
    try {
      const [studentsResponse, missionsResponse] = await Promise.all([
        fetch('/api/admin/students?status=active', { credentials: 'include' }),
        fetch('/api/swim-missions/catalog', { credentials: 'include' }),
      ]);

      if (!studentsResponse.ok) throw new Error('students');
      if (!missionsResponse.ok) throw new Error('missions');

      const studentsPayload = (await studentsResponse.json()) as { students?: Student[] };
      const missionsPayload = (await missionsResponse.json()) as { missions?: Mission[] };

      const nextStudents = studentsPayload.students ?? [];
      const nextMissions = missionsPayload.missions ?? [];
      setStudents(nextStudents);
      setMissions(nextMissions);
      setStudentId((current) => current || nextStudents[0]?.id || '');
      setMissionSlug((current) => current || nextMissions[0]?.slug || '');
    } catch {
      setFeedback('No se pudo cargar alumnos o catálogo de misiones.');
    } finally {
      setLoading(false);
    }
  }

  async function loadAssignments(id: string): Promise<void> {
    if (!id) {
      setAssignments([]);
      return;
    }

    setLoadingAssignments(true);
    try {
      const response = await fetch(
        `/api/admin/swim-missions/assignments?student_id=${encodeURIComponent(id)}`,
        { credentials: 'include' }
      );
      if (!response.ok) throw new Error('assignments');
      const payload = (await response.json()) as { assignments?: Assignment[] };
      setAssignments(payload.assignments ?? []);
    } catch {
      setAssignments([]);
    } finally {
      setLoadingAssignments(false);
    }
  }

  useEffect(() => {
    void loadBase();
  }, []);

  useEffect(() => {
    void loadAssignments(studentId);
  }, [studentId]);

  async function assignMission(): Promise<void> {
    if (!studentId || !missionSlug) return;

    setSubmitting(true);
    setFeedback('');
    try {
      const response = await fetch('/api/admin/swim-missions/assignments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          mission_slug: missionSlug,
          assignment_mode: 'manual',
          reason: reason.trim() || null,
        }),
      });

      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || 'assignment_failed');
      }

      setFeedback('Misión asignada. El origen queda auditado automáticamente por el rol de staff.');
      setReason('');
      await loadAssignments(studentId);
    } catch {
      setFeedback('No se pudo asignar la misión. Revisa permisos, alumno y catálogo.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-3 text-pk-sub">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Cargando práctica en casa…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="rounded-[2rem] bg-[#11253d] p-6 text-white shadow-card sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-teal-100">
              <Waves className="h-4 w-4" aria-hidden />
              Práctica en casa
            </div>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Asignar misión de natación
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
              Profesores, soporte y admin usan el mismo contrato. El backend registra quién
              asignó la misión; n8n usa ese mismo contrato por el endpoint interno.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void loadBase()}
            className="min-h-11"
          >
            <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
            Actualizar
          </Button>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[1.75rem] border border-pk-border bg-white p-5 shadow-card sm:p-6">
          <p className="pk-eyebrow">Asignación manual</p>

          <label className="mt-5 block text-sm font-semibold text-pk-ink">
            Alumno
            <select
              value={studentId}
              onChange={(event) => setStudentId(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-pk-border bg-white px-3 text-sm"
            >
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name}{student.grade ? ` · ${student.grade}` : ''}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block text-sm font-semibold text-pk-ink">
            Misión
            <select
              value={missionSlug}
              onChange={(event) => setMissionSlug(event.target.value)}
              className="mt-2 min-h-12 w-full rounded-xl border border-pk-border bg-white px-3 text-sm"
            >
              {missions.map((mission) => (
                <option key={mission.id} value={mission.slug}>
                  {mission.title}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block text-sm font-semibold text-pk-ink">
            Motivo / indicación para seguimiento
            <textarea
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Ej. Reforzar postura de flecha después de la clase."
              className="mt-2 w-full rounded-xl border border-pk-border bg-white p-3 text-sm"
            />
          </label>

          <Button
            type="button"
            onClick={() => void assignMission()}
            disabled={submitting || !studentId || !missionSlug}
            className="mt-5 min-h-12 w-full"
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Send className="mr-2 h-4 w-4" aria-hidden />
            )}
            Asignar misión
          </Button>

          {feedback ? (
            <p className="mt-4 rounded-xl bg-pk-snow p-3 text-sm text-pk-sub" aria-live="polite">
              {feedback}
            </p>
          ) : null}
        </div>

        <div className="rounded-[1.75rem] border border-pk-border bg-white p-5 shadow-card sm:p-6">
          <p className="pk-eyebrow">Historial</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-pk-ink">
            {selectedStudent?.name ?? 'Alumno'}
          </h2>
          <p className="mt-2 text-sm text-pk-sub">
            Aquí se ve quién asignó cada misión: profesor, soporte, admin o automatización.
          </p>

          {loadingAssignments ? (
            <div className="mt-6 flex items-center gap-2 text-sm text-pk-sub">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Cargando historial…
            </div>
          ) : assignments.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-pk-border p-5 text-sm text-pk-sub">
              Este alumno todavía no tiene misiones asignadas.
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              {assignments.map((assignment) => (
                <article
                  key={assignment.id}
                  className="rounded-2xl border border-pk-border bg-pk-snow p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-pk-primary" aria-hidden />
                      <span className="text-sm font-bold text-pk-ink">
                        {assignment.status}
                      </span>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-pk-sub">
                      {assignment.assigned_by_type}
                    </span>
                  </div>
                  {assignment.reason ? (
                    <p className="mt-3 text-sm leading-6 text-pk-sub">{assignment.reason}</p>
                  ) : null}
                  <p className="mt-2 text-xs text-pk-mutedText">
                    {new Date(assignment.created_at).toLocaleString('es-CO')}
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-teal-200 bg-teal-50 p-5 sm:p-6">
        <h2 className="font-bold text-teal-950">Automatización y override</h2>
        <p className="mt-2 text-sm leading-6 text-teal-900/80">
          n8n puede asignar únicamente misiones secas aprobadas. Profesor, soporte o admin
          conservan el control operativo para seguimiento y futuras acciones de reemplazo/cancelación.
        </p>
      </section>
    </div>
  );
}
