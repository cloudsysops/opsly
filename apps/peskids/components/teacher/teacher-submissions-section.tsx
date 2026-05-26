'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TeacherDashboard } from '@/components/dashboards/teacher-dashboard';

export type TeacherSubmission = {
  submissionId: string;
  studentName: string;
  studentId: string;
  formTitle: string;
  submittedAt: string;
  grade?: number;
  maxGrade: number;
  feedback?: string;
  status: 'reviewed' | 'pending' | 'needs_revision';
};

export type TeacherSubmissionsResponse = {
  submissions: TeacherSubmission[];
  stats: {
    reviewedCount: number;
    pendingCount: number;
    needsRevisionCount: number;
    uniqueStudents: number;
  };
};

interface TeacherSubmissionsSectionProps {
  data: TeacherSubmissionsResponse | null;
  isLoading: boolean;
  error: string | null;
}

export function TeacherSubmissionsSection({
  data,
  isLoading,
  error,
}: TeacherSubmissionsSectionProps): React.ReactElement {
  return (
    <section className="rounded-3xl border border-pk-border bg-white p-5 shadow-card sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
            Respuestas del aula
          </p>
          <h2 className="mt-1 font-display text-xl font-semibold tracking-tight text-pk-ink">
            Entregas y feedback listos para revisar.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-pk-sub">
            Esta capa muestra respuestas reales de estudiantes para revisar, calificar y devolver
            sin salir del flujo de clase.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              window.location.href = '/teacher/submissions';
            }}
          >
            Ver entregas
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              window.location.reload();
            }}
          >
            Actualizar
          </Button>
        </div>
      </div>

      <div className="mt-5">
        {error ? (
          <div className="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-pk-border bg-pk-muted/25 p-6 text-center">
            <p className="text-sm font-medium text-pk-ink">No se pudo cargar el aula</p>
            <p className="max-w-md text-sm text-pk-sub">{error}</p>
          </div>
        ) : isLoading ? (
          <div className="flex min-h-[180px] items-center justify-center rounded-2xl border border-pk-border bg-pk-muted/25">
            <div className="flex items-center gap-2 text-sm text-pk-sub">
              <Loader2 className="h-4 w-4 animate-spin text-pk-primary" aria-hidden />
              Cargando respuestas del aula
            </div>
          </div>
        ) : (
          <TeacherDashboard
            submissions={data?.submissions ?? []}
            isLoading={false}
            onReviewSubmission={() => {
              window.location.href = '/teacher/submissions';
            }}
          />
        )}
      </div>
    </section>
  );
}
