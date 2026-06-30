'use client';

import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { classModalityLabel } from '@/lib/lead-modality';
import type { TrialClassRow } from '@/lib/services/trial-class.service';

type TrialClassItem = TrialClassRow & {
  lead_name: string | null;
  lead_email: string | null;
};

const statusLabel: Record<TrialClassRow['status'], string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  attended: 'Asistió',
  no_show: 'No asistió',
  cancelled: 'Cancelada',
};

const statusTone: Record<
  TrialClassRow['status'],
  'amber' | 'teal' | 'green' | 'coral' | 'neutral'
> = {
  scheduled: 'amber',
  confirmed: 'teal',
  attended: 'green',
  no_show: 'coral',
  cancelled: 'neutral',
};

const nextStatuses: Record<TrialClassRow['status'], TrialClassRow['status'][]> = {
  scheduled: ['confirmed', 'cancelled'],
  confirmed: ['attended', 'no_show', 'cancelled'],
  attended: [],
  no_show: [],
  cancelled: [],
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`));
}

function formatTime(value: string): string {
  const [hours, minutes] = value.split(':');
  return `${hours}:${minutes}`;
}

export function TrialClassesPanel(): React.ReactElement {
  const [items, setItems] = useState<TrialClassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/trial-classes', { credentials: 'include' });
      const json = (await res.json()) as {
        ok?: boolean;
        trial_classes?: TrialClassItem[];
        error?: string;
      };
      if (!res.ok || !json.trial_classes) {
        throw new Error(json.error || 'No se pudieron cargar las clases de prueba');
      }
      setItems(json.trial_classes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar clases de prueba');
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateStatus = async (id: string, status: TrialClassRow['status']): Promise<void> => {
    setUpdatingId(id);
    setError('');
    try {
      const res = await fetch(`/api/admin/trial-classes/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo actualizar la clase');
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar clase de prueba');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <section data-admin-section="trial-classes" className="mb-5">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-pk-primary" aria-hidden />
              Clases de prueba
            </CardTitle>
            <CardDescription>
              Agenda y seguimiento de clases de prueba con interesados.
            </CardDescription>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={() => void load()}>
            Actualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-pk-sub">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Cargando clases de prueba…
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-pk-sub">
              Aún no hay clases de prueba programadas. Desde la sección Interesados puedes agendar
              la primera.
            </p>
          ) : (
            <ul className="divide-y divide-pk-border rounded-xl border border-pk-border">
              {items.map((item) => (
                <li key={item.id} className="space-y-2 px-4 py-3 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-pk-ink">
                        {item.lead_name ?? 'Interesado'}{' '}
                        <span className="text-pk-sub">
                          · {formatDate(item.scheduled_date)} {formatTime(item.scheduled_time)}
                        </span>
                      </p>
                      {item.lead_email ? (
                        <p className="text-xs text-pk-sub">{item.lead_email}</p>
                      ) : null}
                    </div>
                    <Badge tone={statusTone[item.status]}>{statusLabel[item.status]}</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge tone="violet">{classModalityLabel(item.modality)}</Badge>
                    {item.teacher_name ? <Badge tone="teal">{item.teacher_name}</Badge> : null}
                  </div>
                  {item.notes ? <p className="text-xs text-pk-sub">{item.notes}</p> : null}
                  {nextStatuses[item.status].length > 0 ? (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {nextStatuses[item.status].map((status) => (
                        <Button
                          key={status}
                          type="button"
                          size="sm"
                          variant="secondary"
                          disabled={updatingId === item.id}
                          onClick={() => void updateStatus(item.id, status)}
                        >
                          {updatingId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                          ) : (
                            statusLabel[status]
                          )}
                        </Button>
                      ))}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
