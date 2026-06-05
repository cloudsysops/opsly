'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Loader2, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ClassListItem, PeskidsPool, SwimLocation } from '@/lib/class-types';

interface TeamMemberOption {
  user_id: string;
  name: string;
  role: string;
}

interface ClassesApiResponse {
  classes?: ClassListItem[];
  pools?: PeskidsPool[];
  error?: string;
}

function formatClassTime(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function formatCop(cents: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

const emptyForm = {
  title: '',
  level: '3',
  professor_user_id: '',
  pool_id: '',
  location: 'llanogrande' as SwimLocation,
  date: '',
  start_time: '09:00',
  end_time: '10:00',
  capacity: '8',
  price_cents: '85000',
};

export function ClassesPanel(): React.ReactElement {
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [pools, setPools] = useState<PeskidsPool[]>([]);
  const [teachers, setTeachers] = useState<TeamMemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const [classesRes, teamRes] = await Promise.all([
        fetch('/api/admin/classes', { credentials: 'include' }),
        fetch('/api/admin/team', { credentials: 'include' }),
      ]);

      const classesJson = (await classesRes.json()) as ClassesApiResponse;
      if (!classesRes.ok) {
        throw new Error(classesJson.error || 'No se pudieron cargar las clases');
      }

      setClasses(classesJson.classes ?? []);
      setPools(classesJson.pools ?? []);

      if (teamRes.ok) {
        const teamJson = (await teamRes.json()) as {
          members?: Array<{
            user_id: string | null;
            display_name: string | null;
            email: string;
            role: string;
          }>;
        };
        const teacherOptions = (teamJson.members ?? [])
          .filter(
            (member) =>
              (member.role === 'teacher' ||
                member.role === 'admin' ||
                member.role === 'owner') &&
              Boolean(member.user_id)
          )
          .map((member) => ({
            user_id: member.user_id as string,
            name: member.display_name?.trim() || member.email,
            role: member.role,
          }));
        setTeachers(teacherOptions);
      }

      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando clases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const upcoming = useMemo(
    () => classes.filter((c) => c.status === 'scheduled').slice(0, 12),
    [classes]
  );

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    const startsAt = new Date(`${form.date}T${form.start_time}:00`);
    const endsAt = new Date(`${form.date}T${form.end_time}:00`);

    try {
      const res = await fetch('/api/admin/classes', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title.trim(),
          level: Number(form.level),
          professor_user_id: form.professor_user_id,
          pool_id: form.pool_id,
          location: form.location,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt.toISOString(),
          capacity: Number(form.capacity),
          price_cents: Math.round(Number(form.price_cents) * 100),
          currency: 'cop',
        }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo crear la clase');
      }

      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear clase');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section data-admin-section="classes" className="mb-5">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-pk-primary" aria-hidden />
              Clases y calendario
            </CardTitle>
            <CardDescription>
              Programación operativa — profesor, piscina, cupos y precio.
            </CardDescription>
          </div>
          <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            Nueva clase
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          {showForm ? (
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="grid gap-3 rounded-xl border border-pk-border bg-pk-snow p-4 md:grid-cols-2"
            >
              <div className="md:col-span-2">
                <Label htmlFor="class-title">Título</Label>
                <Input
                  id="class-title"
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Delfines · sábado 9:00"
                />
              </div>
              <div>
                <Label htmlFor="class-level">Grupo de edad (1–6)</Label>
                <Input
                  id="class-level"
                  type="number"
                  min={1}
                  max={6}
                  required
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="class-professor">Profesor</Label>
                <select
                  id="class-professor"
                  required
                  className="h-10 w-full rounded-lg border border-pk-border bg-white px-3 text-sm"
                  value={form.professor_user_id}
                  onChange={(e) => setForm({ ...form, professor_user_id: e.target.value })}
                >
                  <option value="">Seleccionar…</option>
                  {teachers.map((t) => (
                    <option key={t.user_id} value={t.user_id}>
                      {t.name} ({t.role})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="class-pool">Piscina</Label>
                <select
                  id="class-pool"
                  required
                  className="h-10 w-full rounded-lg border border-pk-border bg-white px-3 text-sm"
                  value={form.pool_id}
                  onChange={(e) => setForm({ ...form, pool_id: e.target.value })}
                >
                  <option value="">Seleccionar…</option>
                  {pools.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.location})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="class-location">Ubicación</Label>
                <select
                  id="class-location"
                  className="h-10 w-full rounded-lg border border-pk-border bg-white px-3 text-sm"
                  value={form.location}
                  onChange={(e) =>
                    setForm({ ...form, location: e.target.value as SwimLocation })
                  }
                >
                  <option value="llanogrande">Llanogrande</option>
                  <option value="domicilio">Domicilio</option>
                </select>
              </div>
              <div>
                <Label htmlFor="class-date">Fecha</Label>
                <Input
                  id="class-date"
                  type="date"
                  required
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="class-start">Inicio</Label>
                <Input
                  id="class-start"
                  type="time"
                  required
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="class-end">Fin</Label>
                <Input
                  id="class-end"
                  type="time"
                  required
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="class-capacity">Cupos</Label>
                <Input
                  id="class-capacity"
                  type="number"
                  min={1}
                  required
                  value={form.capacity}
                  onChange={(e) => setForm({ ...form, capacity: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="class-price">Precio COP</Label>
                <Input
                  id="class-price"
                  type="number"
                  min={0}
                  required
                  value={form.price_cents}
                  onChange={(e) => setForm({ ...form, price_cents: e.target.value })}
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Publicar clase'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-pk-sub">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Cargando clases…
            </div>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-pk-sub">
              No hay clases programadas. Crea la primera con «Nueva clase».
            </p>
          ) : (
            <ul className="divide-y divide-pk-border rounded-xl border border-pk-border">
              {upcoming.map((item) => (
                <li
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-pk-ink">{item.title}</p>
                    <p className="text-pk-sub">{formatClassTime(item.starts_at)}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={item.enrolled_count >= item.capacity ? 'amber' : 'teal'}>
                      {item.enrolled_count}/{item.capacity}
                    </Badge>
                    <span className="font-mono text-pk-ink">{formatCop(item.price_cents)}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
