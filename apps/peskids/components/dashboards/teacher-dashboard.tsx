'use client';

import { useState, useCallback } from 'react';
import { BookOpen, Users, CheckCircle, MessageSquare, Download, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { peskidsColorTokens } from '@/lib/tokens';

interface StudentSubmission {
  submissionId: string;
  studentName: string;
  studentId: string;
  formTitle: string;
  submittedAt: string;
  grade?: number;
  maxGrade: number;
  feedback?: string;
  status: 'reviewed' | 'pending' | 'needs_revision';
}

interface BulkActionState {
  action: 'mark_reviewed' | 'send_observations' | 'reassign' | null;
  loading: boolean;
}

interface TeacherDashboardProps {
  submissions: StudentSubmission[];
  isLoading?: boolean;
  selectedIds?: string[];
  onSelectionChange?: (ids: string[]) => void;
  onReviewSubmission?: (submissionId: string) => void;
  onExportSubmissions?: () => void;
  onBulkMarkReviewed?: (ids: string[]) => Promise<void>;
  onBulkSendObservations?: (ids: string[]) => Promise<void>;
  onBulkReassign?: (ids: string[]) => Promise<void>;
}

export function TeacherDashboard({
  submissions,
  isLoading = false,
  selectedIds = [],
  onSelectionChange = () => {},
  onReviewSubmission,
  onExportSubmissions,
  onBulkMarkReviewed,
  onBulkSendObservations,
  onBulkReassign,
}: TeacherDashboardProps): React.ReactElement {
  const [bulkState, setBulkState] = useState<BulkActionState>({
    action: null,
    loading: false,
  });

  const allSelected = submissions.length > 0 && selectedIds.length === submissions.length;
  const someSelected = selectedIds.length > 0 && !allSelected;

  const handleSelectAll = useCallback((): void => {
    if (allSelected) {
      onSelectionChange([]);
    } else {
      onSelectionChange(submissions.map((s) => s.submissionId));
    }
  }, [allSelected, submissions, onSelectionChange]);

  const handleSelectOne = useCallback(
    (submissionId: string): void => {
      if (selectedIds.includes(submissionId)) {
        onSelectionChange(selectedIds.filter((id) => id !== submissionId));
      } else {
        onSelectionChange([...selectedIds, submissionId]);
      }
    },
    [selectedIds, onSelectionChange]
  );

  const handleBulkAction = useCallback(
    async (action: BulkActionState['action'], handler?: (ids: string[]) => Promise<void>): Promise<void> => {
      if (!handler || selectedIds.length === 0) return;
      setBulkState({ action, loading: true });
      try {
        await handler(selectedIds);
        onSelectionChange([]);
      } finally {
        setBulkState({ action: null, loading: false });
      }
    },
    [selectedIds, onSelectionChange]
  );
  const reviewedCount = submissions.filter((s) => s.status === 'reviewed').length;
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const needsRevisionCount = submissions.filter((s) => s.status === 'needs_revision').length;
  const uniqueStudents = new Set(submissions.map((s) => s.studentId)).size;

  const skeletonClass = 'h-20 bg-pk-muted animate-pulse rounded-lg';

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CO', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'reviewed':
        return peskidsColorTokens.status.success;
      case 'needs_revision':
        return '#dc2626';
      case 'pending':
        return peskidsColorTokens.secondary.orange;
      default:
        return peskidsColorTokens.neutral.mediumGray;
    }
  };

  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'reviewed':
        return 'Revisado';
      case 'needs_revision':
        return 'Requiere revisión';
      case 'pending':
        return 'Pendiente';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className={skeletonClass} />
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-pk-mutedText">Estudiantes</p>
                    <p className="text-3xl font-bold text-pk-ink mt-1">{uniqueStudents}</p>
                  </div>
                  <div
                    className="rounded-lg p-3"
                    style={{ backgroundColor: `${peskidsColorTokens.primary.blue}20` }}
                  >
                    <Users className="h-6 w-6" style={{ color: peskidsColorTokens.primary.blue }} />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className={skeletonClass} />
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-pk-mutedText">Entregas revisadas</p>
                    <p className="text-3xl font-bold text-pk-ink mt-1">{reviewedCount}</p>
                  </div>
                  <div
                    className="rounded-lg p-3"
                    style={{ backgroundColor: `${peskidsColorTokens.status.success}20` }}
                  >
                    <CheckCircle
                      className="h-6 w-6"
                      style={{ color: peskidsColorTokens.status.success }}
                    />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className={skeletonClass} />
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-pk-mutedText">Pendientes de revisión</p>
                    <p className="text-3xl font-bold text-pk-ink mt-1">{pendingCount}</p>
                  </div>
                  <div className="rounded-lg p-3 bg-yellow-100">
                    <BookOpen className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className={skeletonClass} />
            ) : (
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-pk-mutedText">Requieren revisión</p>
                    <p className="text-3xl font-bold text-pk-ink mt-1">{needsRevisionCount}</p>
                  </div>
                  <div className="rounded-lg p-3 bg-red-100">
                    <MessageSquare className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Student Submissions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Entregas del aula</CardTitle>
              <CardDescription>Revisa y califica las entregas enviadas</CardDescription>
            </div>
            {onExportSubmissions && submissions.length > 0 && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={onExportSubmissions}
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-pk-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : submissions.length === 0 ? (
            <p className="py-6 text-center text-sm text-pk-mutedText">
              No hay entregas de estudiantes aún
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-pk-border">
                    <th className="w-10 py-2 px-2 text-center">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => {
                          if (el) el.indeterminate = someSelected;
                        }}
                        onChange={handleSelectAll}
                        className="h-4 w-4 rounded border-pk-border text-pk-primary focus:ring-pk-primary"
                        aria-label="Seleccionar todas"
                      />
                    </th>
                    <th className="text-left py-2 px-3 font-medium text-pk-ink">Estudiante</th>
                    <th className="text-left py-2 px-3 font-medium text-pk-ink">Formulario</th>
                    <th className="text-left py-2 px-3 font-medium text-pk-ink">Fecha</th>
                    <th className="text-center py-2 px-3 font-medium text-pk-ink">Calificación</th>
                    <th className="text-left py-2 px-3 font-medium text-pk-ink">Estado</th>
                    <th className="text-right py-2 px-3 font-medium text-pk-ink">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((submission) => (
                    <tr
                      key={submission.submissionId}
                      className={`border-b border-pk-border hover:bg-pk-bg ${
                        selectedIds.includes(submission.submissionId) ? 'bg-pk-primary/5' : ''
                      }`}
                    >
                      <td className="py-3 px-2 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(submission.submissionId)}
                          onChange={() => handleSelectOne(submission.submissionId)}
                          className="h-4 w-4 rounded border-pk-border text-pk-primary focus:ring-pk-primary"
                          aria-label={`Seleccionar ${submission.studentName}`}
                        />
                      </td>
                      <td className="py-3 px-3 text-pk-ink font-medium">
                        {submission.studentName}
                      </td>
                      <td className="py-3 px-3 text-pk-ink">{submission.formTitle}</td>
                      <td className="py-3 px-3 text-pk-mutedText text-xs">
                        {formatDate(submission.submittedAt)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        {submission.grade !== undefined ? (
                          <span className="font-medium text-pk-ink">
                            {submission.grade}/{submission.maxGrade}
                          </span>
                        ) : (
                          <span className="text-pk-mutedText">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className="inline-block rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: `${getStatusColor(submission.status)}20`,
                            color: getStatusColor(submission.status),
                          }}
                        >
                          {getStatusLabel(submission.status)}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {onReviewSubmission && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onReviewSubmission(submission.submissionId)}
                          >
                            Revisar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assessment Rubric */}
      <Card>
        <CardHeader>
          <CardTitle>Rúbrica de evaluación</CardTitle>
          <CardDescription>Criterios de evaluación para calificar entregas</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-pk-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-pk-mutedText py-6 text-center">
                Define una rúbrica de evaluación en la configuración del formulario
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Acciones del aula</CardTitle>
              <CardDescription>
                {selectedIds.length > 0
                  ? `${selectedIds.length} entrega${selectedIds.length !== 1 ? 's' : ''} seleccionada${selectedIds.length !== 1 ? 's' : ''}`
                  : 'Selecciona entregas para realizar acciones masivas'}
              </CardDescription>
            </div>
            {selectedIds.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onSelectionChange([])}
              >
                Limpiar selección
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={selectedIds.length === 0 || (bulkState.loading && bulkState.action === 'mark_reviewed')}
              onClick={() => void handleBulkAction('mark_reviewed', onBulkMarkReviewed)}
            >
              {bulkState.loading && bulkState.action === 'mark_reviewed' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Marcar como revisadas
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={selectedIds.length === 0 || (bulkState.loading && bulkState.action === 'send_observations')}
              onClick={() => void handleBulkAction('send_observations', onBulkSendObservations)}
            >
              {bulkState.loading && bulkState.action === 'send_observations' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Enviar observaciones
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={selectedIds.length === 0 || (bulkState.loading && bulkState.action === 'reassign')}
              onClick={() => void handleBulkAction('reassign', onBulkReassign)}
            >
              {bulkState.loading && bulkState.action === 'reassign' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              Reasignar a estudiantes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
