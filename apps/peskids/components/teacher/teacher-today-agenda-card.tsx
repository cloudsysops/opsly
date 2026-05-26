'use client';

import { CheckCircle2, ClipboardList, PencilLine, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { DaySlot } from './teacher-weekly-static-data';

function slotStatusLabel(status: DaySlot['status']): string {
  if (status === 'ongoing') return 'En curso';
  if (status === 'done') return 'Hecha';
  return 'Agenda';
}

interface TeacherTodayAgendaCardProps {
  slots: readonly DaySlot[];
}

export function TeacherTodayAgendaCard({
  slots,
}: TeacherTodayAgendaCardProps): React.ReactElement {
  return (
    <Card className="xl:col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-4 w-4 text-pk-primary" aria-hidden />
          Clases de hoy
        </CardTitle>
        <CardDescription>Lo que toca revisar antes de terminar el dia.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {slots.map((slot) => (
          <div
            key={`${slot.day}-${slot.time}`}
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
  );
}
