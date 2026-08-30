'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Download, Loader2, MessageSquare, Users } from 'lucide-react';
import { useParams } from 'next/navigation';
import { FeedbackComposer } from '@/components/feedback/feedback-composer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { gradeInterestedLabel } from '@/lib/peskids-intake-messages';
import { createClient } from '@/lib/supabase-browser';

interface StudentSubmission {
  submissionId: string;
  studentName: string;
  studentId: string;
  formTitle: string;
  submittedAt: string;
  parentEmail?: string | null;
  grade?: number | null;
  maxGrade: number;
  feedback?: string | null;
  status: 'reviewed' | 'pending' | 'needs_revision';
  studentLevel?: string;
  progressPercent?: number;
}

interface TeacherSubmissionsPayload {
  submissions: StudentSubmission[];
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

function getStatusTone(status: StudentSubmission['status']): 'teal' | 'amber' | 'green' {
  switch (status) {
    case 'reviewed':
      return 'green';
    case 'needs_revision':
      return 'amber';
    case 'pending':
    default:
      return 'teal';
  }
}

export default function TeacherSubmissionDetailPage(): React.ReactElement {
  const [submissions, setSubmissions] = useState<StudentSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [staffUserId, setStaffUserId] = useState<string | null>(null);
  const [scoreInput, setScoreInput] = useState('');
  const [feedbackInput, setFeedbackInput] = useState('');
  const [gradeSaving, setGradeSaving] = useState(false);
  const [gradeError, setGradeError] = useState('');
  const [gradeSuccess, setGradeSuccess] = useState(false);
  const params = useParams<{ submissionId: string }>();

  const fetchSubmissions = useCallback(async (): Promise<void> => {
    try {
      const response = await fetch('/api/submissions/teacher', {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch submissions');
      }

      const payload = (await response.json()) as TeacherSubmissionsPayload;
      setSubmissions(payload.submissions || []);
      setError('');
    } catch (err) {
      setError('No se pudo cargar la ficha de la entrega.');
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

  const selectedSubmission = useMemo(
    () => submissions.find((submission) => submission.submissionId === params.submissionId) ?? null,
    [params.submissionId, submissions]
  );

  useEffect(() => {
    if (!selectedSubmission) return;
    setScoreInput(
      typeof selectedSubmission.grade === 'number' ? String(selectedSubmission.grade) : ''
    );
    setFeedbackInput(selectedSubmission.feedback ?? '');
  }, [selectedSubmission]);

  const handleGradeSubmit = useCallback(
    async (e: React.FormEvent): Promise<void> => {
      e.preventDefault();
      if (!selectedSubmission) return;

      setGradeError('');
      setGradeSuccess(false);

      const score = Number(scoreInput);
      if (!Number.isFinite(score) || score < 0 || score > 100) {
        setGradeError('La calificación debe ser un número entre 0 y 100.');
        return;
      }

      setGradeSaving(true);
      try {
        const response = await fetch(
          `/api/submissions/${encodeURIComponent(selectedSubmission.submissionId)}/grade`,
          {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              score,
              feedback: feedbackInput.trim() || undefined,
            }),
          }
        );

        if (!response.ok) {
          const payload = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(payload.error || 'No se pudo guardar la calificación.');
        }

        setGradeSuccess(true);
        await fetchSubmissions();
      } catch (err) {
        setGradeError(err instanceof Error ? err.message : 'No se pudo guardar la calificación.');
      } finally {
        setGradeSaving(false);
      }
    },
    [selectedSubmission, scoreInput, feedbackInput, fetchSubmissions]
  );

  const normalizedLevel = selectedSubmission?.studentLevel
    ? gradeInterestedLabel(selectedSubmission.studentLevel)
    : 'No informado';
  const progressPercent = selectedSubmission?.progressPercent ?? 0;

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-pk-bg">
        <Loader2 className="h-10 w-10 animate-spin text-pk-primary" aria-hidden />
        <p className="text-sm text-pk-sub">Cargando ficha de entrega…</p>
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

  if (!selectedSubmission) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pk-bg p-4">
        <div className="max-w-lg rounded-2xl border border-pk-border bg-white p-6 text-center shadow-card">
          <p className="text-lg font-semibold text-pk-ink">No encontramos esta entrega</p>
          <p className="mt-2 text-sm text-pk-sub">
            Puede que ya no exista o que todavía no haya cargado en esta sesión.
          </p>
          <Button className="mt-4" onClick={() => (window.location.href = '/teacher/submissions')}>
            Volver a entregas
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pk-bg p-4 sm:p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <section className="rounded-3xl border border-pk-border bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
                Peskids / Profesores
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pk-ink sm:text-3xl">
                {selectedSubmission.studentName}
              </h1>
              <p className="mt-2 text-sm leading-6 text-pk-sub">
                {selectedSubmission.formTitle} · {formatDateTime(selectedSubmission.submittedAt)}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => (window.location.href = '/teacher/submissions')}
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                <span className="ml-1">Volver</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  const csv = [
                    [
                      'submissionId',
                      'studentName',
                      'studentId',
                      'formTitle',
                      'submittedAt',
                      'grade',
                      'maxGrade',
                      'status',
                      'feedback',
                    ]
                      .map((value) => `"${value}"`)
                      .join(','),
                    [
                      selectedSubmission.submissionId,
                      selectedSubmission.studentName,
                      selectedSubmission.studentId,
                      selectedSubmission.formTitle,
                      selectedSubmission.submittedAt,
                      selectedSubmission.grade?.toString() ?? '',
                      selectedSubmission.maxGrade.toString(),
                      selectedSubmission.status,
                      selectedSubmission.feedback ?? '',
                    ]
                      .map((value) => `"${String(value).split('"').join('""')}"`)
                      .join(','),
                  ].join('\n');

                  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                  const url = URL.createObjectURL(blob);
                  const anchor = document.createElement('a');
                  anchor.href = url;
                  anchor.download = `peskids-submission-${selectedSubmission.submissionId}.csv`;
                  anchor.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download className="h-4 w-4" aria-hidden />
                <span className="ml-1">Exportar</span>
              </Button>
            </div>
          </div>
        </section>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-pk-mutedText">Estudiante</p>
              <p className="mt-1 text-xl font-semibold text-pk-ink">
                {selectedSubmission.studentName}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-pk-mutedText">Formulario</p>
              <p className="mt-1 text-xl font-semibold text-pk-ink">
                {selectedSubmission.formTitle}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-pk-mutedText">Estado</p>
              <Badge tone={getStatusTone(selectedSubmission.status)} className="mt-2">
                {selectedSubmission.status}
              </Badge>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm text-pk-mutedText">Calificación</p>
              <p className="mt-1 text-2xl font-semibold text-pk-ink">
                {typeof selectedSubmission.grade === 'number'
                  ? `${selectedSubmission.grade}/${selectedSubmission.maxGrade}`
                  : '—'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-pk-primary" aria-hidden />
                Etapa del estudiante
              </CardTitle>
              <CardDescription>Dato de interés capturado en el intake.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xl font-semibold text-pk-ink">{normalizedLevel}</p>
              <p className="text-sm text-pk-sub">
                {selectedSubmission.studentLevel
                  ? 'Se usará para ubicar al alumno en el grupo correcto.'
                  : 'Todavía no hay una etapa específica asociada a esta entrega.'}
              </p>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MessageSquare className="h-4 w-4 text-pk-primary" aria-hidden />
                Calificar entrega
              </CardTitle>
              <CardDescription>
                Guarda la nota y el feedback sin salir del flujo de clase.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => void handleGradeSubmit(e)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-[120px_1fr]">
                  <div>
                    <Label htmlFor="grade-score">Calificación</Label>
                    <Input
                      id="grade-score"
                      type="number"
                      min={0}
                      max={100}
                      value={scoreInput}
                      onChange={(e) => setScoreInput(e.target.value)}
                      placeholder="0-100"
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="grade-feedback">Feedback</Label>
                    <textarea
                      id="grade-feedback"
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      placeholder="Notas para la familia o para el seguimiento interno..."
                      className="pk-input mt-2 min-h-[80px]"
                    />
                  </div>
                </div>

                {gradeError && <p className="text-sm text-red-600">{gradeError}</p>}
                {gradeSuccess && !gradeError && (
                  <p className="text-sm text-emerald-600">Calificación guardada.</p>
                )}

                <Button type="submit" disabled={gradeSaving}>
                  {gradeSaving ? 'Guardando…' : 'Guardar calificación'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4 text-pk-primary" aria-hidden />
                Progreso
              </CardTitle>
              <CardDescription>Avance visible para seguimiento docente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-semibold text-pk-ink">{progressPercent}%</p>
                <Badge
                  tone={
                    selectedSubmission.status === 'reviewed'
                      ? 'green'
                      : selectedSubmission.status === 'needs_revision'
                        ? 'amber'
                        : 'teal'
                  }
                >
                  {selectedSubmission.status}
                </Badge>
              </div>
              <div className="h-2 rounded-full bg-pk-muted">
                <div
                  className="h-2 rounded-full bg-pk-primary"
                  style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                />
              </div>
              <p className="text-sm text-pk-sub">
                {progressPercent >= 90
                  ? 'Muy cerca de completar este hito.'
                  : progressPercent >= 60
                    ? 'Va bien; sigue consolidando técnica.'
                    : 'Está en fase inicial y necesita más acompañamiento.'}
              </p>
              <div className="pt-1 text-sm text-pk-sub">
                <p>
                  <span className="font-medium text-pk-ink">ID estudiante:</span>{' '}
                  {selectedSubmission.studentId}
                </p>
                <p className="mt-1">
                  <span className="font-medium text-pk-ink">Fecha de envío:</span>{' '}
                  {formatDateTime(selectedSubmission.submittedAt)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <FeedbackComposer
          title="Enviar feedback a la familia"
          description="Comparte avances, observaciones y próximos pasos sin salir de la ficha."
          submitLabel="Enviar a la familia"
          authorType="teacher"
          subjectType="student"
          childNameLabel="Nombre del estudiante"
          childNameDefault={selectedSubmission.studentName}
          childNameLocked
          parentEmailLabel="Email de la familia"
          parentEmailDefault={selectedSubmission.parentEmail ?? ''}
          parentEmailLocked={Boolean(selectedSubmission.parentEmail)}
          parentEmailHidden={false}
          parentEmail={selectedSubmission.parentEmail ?? null}
          authorRefId={staffUserId}
          subjectRefId={selectedSubmission.studentId}
          visibility="public"
          audience="family"
          subjectHint={`Este feedback quedará ligado a ${selectedSubmission.studentName} y servirá para el seguimiento familiar.`}
          className="mt-4"
        />
      </div>
    </div>
  );
}
