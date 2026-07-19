'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Loader2, MessageSquare, Sparkles, Users, ArrowRight } from 'lucide-react';
import { TeacherDashboard } from '@/components/dashboards/teacher-dashboard';
import { FeedbackComposer } from '@/components/feedback/feedback-composer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { gradeInterestedLabel } from '@/lib/peskids-intake-messages';
import { createClient } from '@/lib/supabase-browser';

interface StudentSubmission {
  submissionId: string;
  studentName: string;
  studentId: string;
  formTitle: string;
  submittedAt: string;
  parentEmail?: string | null;
  grade?: number;
  maxGrade: number;
  feedback?: string;
  status: 'reviewed' | 'pending' | 'needs_revision';
  studentLevel?: string;
  progressPercent?: number;
}

interface TeacherSubmissionsPayload {
  submissions: StudentSubmission[];
  stats: {
    reviewedCount: number;
    pendingCount: number;
    needsRevisionCount: number;
    uniqueStudents: number;
  };
}

function formatDateTime(dateString: string): string {
  try {
    return new Date(dateString).toLocaleString('es-CO', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

function escapeCsvCell(value: string): string {
  return `"${value.split('"').join('""')}"`;
}

export default function TeacherSubmissionsPage(): React.ReactElement {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [staffUserId, setStaffUserId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkNotification, setBulkNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const fetchSubmissions = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await fetch('/api/submissions/teacher', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const data = (await response.json()) as TeacherSubmissionsPayload;
      setSubmissions(data.submissions || []);
      setError('');
    } catch (err) {
      setError('No se pudieron cargar las respuestas de estudiantes. Intenta más tarde.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSubmissions();
  }, [fetchSubmissions]);

  useEffect(() => {
    const supabase = createClient();
    void (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (user) {
        setStaffUserId(user.id);
      }
    })();
  }, []);

  const stats = useMemo(() => {
    const reviewedCount = submissions.filter(
      (submission) => submission.status === 'reviewed'
    ).length;
    const pendingCount = submissions.filter((submission) => submission.status === 'pending').length;
    const needsRevisionCount = submissions.filter(
      (submission) => submission.status === 'needs_revision'
    ).length;
    const uniqueStudents = new Set(submissions.map((submission) => submission.studentId)).size;

    return {
      reviewedCount,
      pendingCount,
      needsRevisionCount,
      uniqueStudents,
    };
  }, [submissions]);

  const selectedSubmission = useMemo(
    () =>
      submissions.find((submission) => submission.submissionId === selectedSubmissionId) ?? null,
    [selectedSubmissionId, submissions]
  );

  const selectedLevel = selectedSubmission?.studentLevel
    ? gradeInterestedLabel(selectedSubmission.studentLevel)
    : 'No informado';
  const selectedProgress = selectedSubmission?.progressPercent ?? 0;

  const handleReviewSubmission = useCallback((submissionId: string): void => {
    setSelectedSubmissionId(submissionId);
    document
      .getElementById('submission-preview')
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleExportSubmissions = useCallback((): void => {
    if (submissions.length === 0) {
      return;
    }

    const headers = [
      'submissionId',
      'studentName',
      'studentId',
      'formTitle',
      'submittedAt',
      'grade',
      'maxGrade',
      'status',
      'feedback',
    ];
    const rows = submissions.map((submission) =>
      [
        submission.submissionId,
        submission.studentName,
        submission.studentId,
        submission.formTitle,
        submission.submittedAt,
        submission.grade?.toString() ?? '',
        submission.maxGrade.toString(),
        submission.status,
        submission.feedback ?? '',
      ]
        .map(escapeCsvCell)
        .join(',')
    );

    const csv = [headers.map(escapeCsvCell).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `peskids-teacher-submissions-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, [submissions]);

  const clearBulkNotification = useCallback((): void => {
    setBulkNotification(null);
  }, []);

  useEffect(() => {
    if (bulkNotification) {
      const timer = setTimeout(clearBulkNotification, 4000);
      return () => clearTimeout(timer);
    }
  }, [bulkNotification, clearBulkNotification]);

  const handleBulkMarkReviewed = useCallback(async (ids: string[]): Promise<void> => {
    try {
      const response = await fetch('/api/submissions/bulk-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ submissionIds: ids, action: 'mark_reviewed' }),
      });
      if (!response.ok) {
        const err = (await response.json()) as { error?: string };
        throw new Error(err.error || 'Error al marcar como revisadas');
      }
      setBulkNotification({ type: 'success', message: `${ids.length} entrega${ids.length !== 1 ? 's' : ''} marcada${ids.length !== 1 ? 's' : ''} como revisada${ids.length !== 1 ? 's' : ''}` });
      await fetchSubmissions();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al marcar como revisadas';
      setBulkNotification({ type: 'error', message });
    }
  }, [fetchSubmissions]);

  const handleBulkSendObservations = useCallback(async (ids: string[]): Promise<void> => {
    try {
      const response = await fetch('/api/submissions/bulk-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ submissionIds: ids, action: 'send_observations' }),
      });
      if (!response.ok) {
        const err = (await response.json()) as { error?: string };
        throw new Error(err.error || 'Error al enviar observaciones');
      }
      setBulkNotification({ type: 'success', message: `Observaciones enviadas para ${ids.length} entrega${ids.length !== 1 ? 's' : ''}` });
      await fetchSubmissions();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al enviar observaciones';
      setBulkNotification({ type: 'error', message });
    }
  }, [fetchSubmissions]);

  const handleBulkReassign = useCallback(async (ids: string[]): Promise<void> => {
    try {
      const response = await fetch('/api/submissions/bulk-grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ submissionIds: ids, action: 'reassign' }),
      });
      if (!response.ok) {
        const err = (await response.json()) as { error?: string };
        throw new Error(err.error || 'Error al reasignar');
      }
      setBulkNotification({ type: 'success', message: `${ids.length} entrega${ids.length !== 1 ? 's' : ''} reasignada${ids.length !== 1 ? 's' : ''}` });
      await fetchSubmissions();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al reasignar';
      setBulkNotification({ type: 'error', message });
    }
  }, [fetchSubmissions]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-pk-bg">
        <Loader2 className="h-10 w-10 animate-spin text-pk-primary" aria-hidden />
        <p className="text-sm text-pk-sub">Cargando respuestas de estudiantes…</p>
      </div>
    );
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
    );
  }

  return (
    <div className="min-h-screen bg-pk-bg p-4 sm:p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-pk-border bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
                Peskids / Profesores
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pk-ink sm:text-3xl">
                Respuestas de estudiantes
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-pk-sub">
                Revisa entregas, deja feedback y exporta el seguimiento del aula sin salir de la
                superficie de trabajo del profesor.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={() => void fetchSubmissions()}>
                Actualizar
              </Button>
              <Button type="button" variant="ghost" onClick={handleExportSubmissions}>
                <Download className="h-4 w-4" aria-hidden />
                <span className="ml-1">Exportar CSV</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => (window.location.href = '/teacher/dashboard')}
              >
                Volver al dashboard
              </Button>
            </div>
          </div>
        </section>

        <FeedbackComposer
          title="Feedback para la familia"
          description="Comparte avances, observaciones y próximos pasos de un alumno sin salir de esta vista."
          submitLabel="Enviar a la familia"
          authorType="teacher"
          subjectType="student"
          childNameLabel="Nombre del estudiante"
          parentEmailLabel="Email de la familia"
          parentEmailHidden={false}
          parentEmail={null}
          authorRefId={staffUserId}
          visibility="public"
          audience="family"
          subjectHint="Este bloque sirve para notas directas de profesor a familia, incluso si todavía no hay entregas seleccionadas."
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pk-mutedText">Estudiantes</p>
                  <p className="mt-1 text-3xl font-bold text-pk-ink">{stats.uniqueStudents}</p>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-pk-primary">
                  <Users className="h-6 w-6" aria-hidden />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pk-mutedText">Revisadas</p>
                  <p className="mt-1 text-3xl font-bold text-pk-ink">{stats.reviewedCount}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3 text-emerald-600">
                  <Sparkles className="h-6 w-6" aria-hidden />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pk-mutedText">Pendientes</p>
                  <p className="mt-1 text-3xl font-bold text-pk-ink">{stats.pendingCount}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-3 text-amber-600">
                  <MessageSquare className="h-6 w-6" aria-hidden />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-pk-mutedText">Requieren revisión</p>
                  <p className="mt-1 text-3xl font-bold text-pk-ink">{stats.needsRevisionCount}</p>
                </div>
                <div className="rounded-lg bg-rose-50 p-3 text-rose-600">
                  <Loader2 className="h-6 w-6" aria-hidden />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {selectedSubmission ? (
          <Card id="submission-preview" className="border-pk-primary/20 bg-blue-50/40">
            <CardHeader>
              <CardTitle className="text-base">Entrega seleccionada</CardTitle>
              <CardDescription>
                {selectedSubmission.studentName} · {selectedSubmission.formTitle}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-pk-border bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pk-mutedText">
                    Fecha
                  </p>
                  <p className="mt-1 text-sm text-pk-ink">
                    {formatDateTime(selectedSubmission.submittedAt)}
                  </p>
                </div>
                <div className="rounded-2xl border border-pk-border bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pk-mutedText">
                    Estado
                  </p>
                  <p className="mt-1 text-sm text-pk-ink">{selectedSubmission.status}</p>
                </div>
              </div>
              <p className="text-sm text-pk-sub">
                {selectedSubmission.feedback || 'Aún no hay feedback agregado para esta entrega.'}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-pk-border bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pk-mutedText">
                    Edad / rango
                  </p>
                  <p className="mt-1 text-sm font-medium text-pk-ink">{selectedLevel}</p>
                </div>
                <div className="rounded-2xl border border-pk-border bg-white p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pk-mutedText">
                    Progreso
                  </p>
                  <div className="mt-2 h-2 rounded-full bg-pk-muted">
                    <div
                      className="h-2 rounded-full bg-pk-primary"
                      style={{ width: `${Math.max(0, Math.min(100, selectedProgress))}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm font-medium text-pk-ink">{selectedProgress}%</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    window.location.href = `/teacher/submissions/${selectedSubmission.submissionId}`;
                  }}
                >
                  Abrir ficha
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSelectedSubmissionId(null);
                  }}
                >
                  Cerrar vista
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {bulkNotification && (
          <div
            className={`rounded-2xl border p-4 text-sm ${
              bulkNotification.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}
          >
            {bulkNotification.message}
          </div>
        )}

        <TeacherDashboard
          submissions={submissions}
          isLoading={false}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          onReviewSubmission={handleReviewSubmission}
          onExportSubmissions={handleExportSubmissions}
          onBulkMarkReviewed={handleBulkMarkReviewed}
          onBulkSendObservations={handleBulkSendObservations}
          onBulkReassign={handleBulkReassign}
        />
      </div>
    </div>
  );
}
