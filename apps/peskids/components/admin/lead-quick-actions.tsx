'use client';

import { useState } from 'react';
import { Loader2, Check, Clock, X, GraduationCap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DashboardData } from '@/lib/types';

type LeadRow = DashboardData['new_leads'][number];

type LeadQuickActionsProps = {
  leadId: string;
  currentStatus: LeadRow['status'];
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onFeedback: (message: string) => void;
  onCompleted: () => void;
};

type QuickActionModalState = 'closed' | 'mark_attended' | 'hold' | 'confirm_cancel';

export function LeadQuickActions({
  leadId,
  currentStatus,
  busy,
  onBusyChange,
  onFeedback,
  onCompleted,
}: LeadQuickActionsProps): React.ReactElement {
  const [modalOpen, setModalOpen] = useState<QuickActionModalState>('closed');
  const [teacherName, setTeacherName] = useState('');
  const [scheduledDate, setScheduledDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [scheduledTime, setScheduledTime] = useState('14:00');
  const [holdMonth, setHoldMonth] = useState('');

  const canQuickAction = !['enrolled', 'active', 'renewal', 'archived'].includes(currentStatus);
  const canEnroll = currentStatus === 'trial';

  const actionFeedbackLabel: Record<'mark_attended' | 'mark_enrolled' | 'hold' | 'cancel', string> = {
    mark_attended: 'Atendido',
    mark_enrolled: 'Matriculado',
    hold: 'Puesto en espera',
    cancel: 'Cancelado',
  };

  const handleQuickAction = async (action: 'mark_attended' | 'mark_enrolled' | 'hold' | 'cancel') => {
    onBusyChange(true);
    onFeedback('');

    try {
      const body: Record<string, unknown> = { action };

      if (action === 'mark_attended') {
        body.teacher_name = teacherName.trim() || undefined;
        body.scheduled_date = scheduledDate;
        body.scheduled_time = scheduledTime;
        body.reason = 'marked_attended_from_panel';
      } else if (action === 'mark_enrolled') {
        body.reason = 'marked_enrolled_from_panel';
      } else if (action === 'hold') {
        body.hold_until_month = holdMonth || 'próximo mes';
      }

      const response = await fetch(`/api/admin/leads/${leadId}/quick-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = (await response.json()) as { ok?: boolean; error?: string; message?: string };

      if (!response.ok || !json.ok) {
        throw new Error(json.error || json.message || 'Quick action failed');
      }

      setModalOpen('closed');
      onFeedback(`✅ ${actionFeedbackLabel[action]}`);
      onCompleted();
    } catch (error) {
      onFeedback(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      onBusyChange(false);
    }
  };

  return (
    <>
      {/* Quick Action Buttons */}
      {canQuickAction && (
        <Card accent="green" className="border-pk-border bg-teal-50/30">
          <CardHeader>
            <CardTitle className="text-base">Acciones rápidas</CardTitle>
            <CardDescription>Atender, posponer o cancelar este lead.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {canEnroll ? (
                <Button
                  size="lg"
                  variant="primary"
                  disabled={busy}
                  onClick={() => void handleQuickAction('mark_enrolled')}
                  className="gap-2 flex-1 min-w-max"
                >
                  {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <GraduationCap className="h-5 w-5" />}
                  Matricular
                </Button>
              ) : (
                <Button
                  size="lg"
                  variant="primary"
                  disabled={busy}
                  onClick={() => setModalOpen('mark_attended')}
                  className="gap-2 flex-1 min-w-max"
                >
                  <Check className="h-5 w-5" />
                  Marcar Atendido
                </Button>
              )}
              <Button
                size="lg"
                variant="secondary"
                disabled={busy}
                onClick={() => setModalOpen('hold')}
                className="gap-2 flex-1 min-w-max"
              >
                <Clock className="h-5 w-5" />
                Posponer
              </Button>
              <Button
                size="lg"
                variant="ghost"
                disabled={busy}
                onClick={() => setModalOpen('confirm_cancel')}
                className="gap-2 flex-1 min-w-max text-rose-700 hover:bg-rose-100"
              >
                <X className="h-5 w-5" />
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Mark Attended Modal */}
      {modalOpen === 'mark_attended' && (
        <Card className="border-pk-border bg-blue-50/30">
          <CardHeader>
            <CardTitle className="text-base">Asignar Profesor y Clase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="teacher-name">Profesor (opcional)</Label>
              <Input
                id="teacher-name"
                placeholder="Nombre del profesor"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="scheduled-date">Fecha de clase (opcional)</Label>
                <Input
                  id="scheduled-date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  disabled={busy}
                />
              </div>
              <div>
                <Label htmlFor="scheduled-time">Hora de clase (opcional)</Label>
                <Input
                  id="scheduled-time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  disabled={busy}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                disabled={busy}
                onClick={() => handleQuickAction('mark_attended')}
                className="flex-1 gap-2"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Guardar y Atender
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setModalOpen('closed')}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hold Modal */}
      {modalOpen === 'hold' && (
        <Card className="border-pk-border bg-amber-50/30">
          <CardHeader>
            <CardTitle className="text-base">Posponer Contacto</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="hold-month">¿Hasta cuándo?</Label>
              <Input
                id="hold-month"
                placeholder="ej: Septiembre, Próximo mes, 2026-09-15"
                value={holdMonth}
                onChange={(e) => setHoldMonth(e.target.value)}
                disabled={busy}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => handleQuickAction('hold')}
                className="flex-1 gap-2"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Posponer
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setModalOpen('closed')}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Confirmation Modal */}
      {modalOpen === 'confirm_cancel' && (
        <Card className="border-pk-border bg-rose-50/30">
          <CardHeader>
            <CardTitle className="text-base">¿Cancelar este lead?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-pk-sub">Esta acción archivará el lead y no se podrá recuperar fácilmente.</p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1 text-rose-700 hover:bg-rose-100"
                disabled={busy}
                onClick={() => handleQuickAction('cancel')}
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Sí, Cancelar
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => setModalOpen('closed')}
                className="flex-1"
              >
                No, Volver
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
