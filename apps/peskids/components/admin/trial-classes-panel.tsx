'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { classModalityLabel } from '@/lib/lead-modality';
import { groupTrialClassesByDate } from '@/lib/trial-agenda';
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

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(base: string, days: number): string {
  const date = new Date(`${base}T12:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date(`${value}T12:00:00`));
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
  const [from, setFrom] = useState(() => todayIso());
  const [to, setTo] = useState(() => addDaysIso(todayIso(), 6));
  const [teacherName, setTeacherName] = useState('');
  const [statusFilter, setStatusFilter] = useState<TrialClassRow['status'] | 'all'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (teacherName.trim()) params.set('teacher_name', teacherName.trim());
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await fetch(`/api/admin/trial-classes?${params.toString()}`, {
        credentials: 'include',
      });
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
  }, [from, statusFilter, teacherName, to]);

  useEffect(() => {
    void load();
  }, [load]);

  const groups = useMemo(() => groupTrialClassesByDate(items), [items]);

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

  const setThisWeek = (): void => {
    const start = todayIso();
    setFrom(start);
    setTo(addDaysIso(start, 6));
  };

  const setTodayOnly = (): void => {
    const day = todayIso();
    setFrom(day);
    setTo(day);
  };

  return (
    <section data-admin-section="trial-classes" className="mb-5">
      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-pk-primary" aria-hidden />
              Agenda de clases de prueba
            </CardTitle>
            <CardDescription>
              Vista por día con filtros de fecha y profesor. Confirma, marca asistencia o no-show.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant="secondary" onClick={setTodayOnly}>
              Hoy
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={setThisWeek}>
              7 días
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => void load()}>
              Actualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1">
              <Label htmlFor="trial-from">Desde</Label>
              <Input
                id="trial-from"
                type="date"
                value={from}
                onChange={(event) => setFrom(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="trial-to">Hasta</Label>
              <Input
                id="trial-to"
                type="date"
                value={to}
                onChange={(event) => setTo(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="trial-teacher">Profesor</Label>
              <Input
                id="trial-teacher"
                value={teacherName}
                placeholder="Nombre…"
                onChange={(event) => setTeacherName(event.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="trial-status">Estado</Label>
              <select
                id="trial-status"
                className="pk-input h-10 w-full"
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as TrialClassRow['status'] | 'all')
                }
              >
                <option value="all">Todos</option>
                {(Object.keys(statusLabel) as TrialClassRow['status'][]).map((status) => (
                  <option key={status} value={status}>
                    {statusLabel[status]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-pk-sub">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Cargando agenda…
            </div>
          ) : groups.length === 0 ? (
            <p className="text-sm text-pk-sub">
              No hay clases de prueba en este rango. Agenda desde Interesados o la ficha 360.
            </p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.date} className="space-y-2">
                  <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-pk-mutedText">
                    {formatDate(group.date)}
                  </h3>
                  <ul className="divide-y divide-pk-border rounded-xl border border-pk-border">
                    {group.items.map((item) => (
                      <li key={item.id} className="space-y-2 px-4 py-3 text-sm">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-pk-ink">
                              <Link
                                href={`/admin/interesados/${item.lead_id}`}
                                className="underline-offset-2 hover:underline"
                              >
                                {item.lead_name ?? 'Interesado'}
                              </Link>{' '}
                              <span className="text-pk-sub">
                                · {formatTime(item.scheduled_time)}
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
                          {item.teacher_name ? (
                            <Badge tone="teal">{item.teacher_name}</Badge>
                          ) : null}
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
