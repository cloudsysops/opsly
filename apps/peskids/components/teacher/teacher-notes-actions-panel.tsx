'use client';

import { MessageSquare } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { TeacherNote } from './teacher-weekly-static-data';

function priorityTone(priority: TeacherNote['priority']): 'amber' | 'violet' | 'green' {
  if (priority === 'alta') return 'amber';
  if (priority === 'media') return 'violet';
  return 'green';
}

interface TeacherNotesActionsPanelProps {
  notes: readonly TeacherNote[];
}

export function TeacherNotesActionsPanel({
  notes,
}: TeacherNotesActionsPanelProps): React.ReactElement {
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4 text-pk-primary" aria-hidden />
            Observaciones y feedback
          </CardTitle>
          <CardDescription>
            Notas cortas para dar seguimiento sin abrir otra herramienta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-2xl border border-pk-border bg-pk-muted/35 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-pk-ink">{note.student}</p>
                  <p className="text-xs text-pk-sub">{note.className}</p>
                </div>
                <Badge tone={priorityTone(note.priority)}>{note.priority}</Badge>
              </div>
              <p className="mt-2 text-sm text-pk-sub">{note.note}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Acciones rapidas</CardTitle>
          <CardDescription>Trabajo del dia en una sola vista.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button type="button" className="w-full justify-start" variant="secondary">
            Marcar asistencia
          </Button>
          <Button type="button" className="w-full justify-start" variant="ghost">
            Registrar nota de clase
          </Button>
          <Button type="button" className="w-full justify-start" variant="ghost">
            Revisar feedback familiar
          </Button>
          <Button type="button" className="w-full justify-start" variant="ghost">
            Ver agenda de la semana
          </Button>
        </CardContent>
      </Card>
    </>
  );
}
