'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, MessageCircle, Plus, Trophy, UsersRound } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { formatAgeRange } from '@/lib/peskids-domain';

interface StudentRow {
  id: string;
  name: string;
  grade: string;
  status: 'active' | 'inactive';
  parent_email: string | null;
  parent_phone: string | null;
  enrollment_date: string;
  notes: string | null;
}

interface StudentsApiResponse {
  students?: StudentRow[];
  error?: string;
}

function mailtoHref(email: string): string {
  return `mailto:${encodeURIComponent(email)}`;
}

function whatsappHref(phone: string): string | null {
  const digits = phone.replace(/\D+/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}

const emptyForm = {
  name: '',
  grade: '',
  parent_email: '',
  parent_phone: '',
  notes: '',
};

export function StudentsPanel(): React.ReactElement {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [badgingId, setBadgingId] = useState<string | null>(null);
  const [badgeLabel, setBadgeLabel] = useState('');
  const [awardingBadge, setAwardingBadge] = useState(false);

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/students', { credentials: 'include' });
      const json = (await res.json()) as StudentsApiResponse;
      if (!res.ok) {
        throw new Error(json.error || 'No se pudieron cargar los alumnos');
      }
      setStudents(json.students ?? []);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando alumnos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        s.grade.toLowerCase().includes(term) ||
        (s.parent_email ?? '').toLowerCase().includes(term)
    );
  }, [students, search]);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/admin/students', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          grade: form.grade.trim(),
          parent_email: form.parent_email.trim() || undefined,
          parent_phone: form.parent_phone.trim() || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo crear el alumno');
      }

      setShowForm(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear alumno');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStatus = async (student: StudentRow): Promise<void> => {
    setUpdatingId(student.id);
    setError('');
    try {
      const nextStatus = student.status === 'active' ? 'inactive' : 'active';
      const res = await fetch(`/api/admin/students/${student.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo actualizar el alumno');
      }

      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar alumno');
    } finally {
      setUpdatingId(null);
    }
  };

  const awardBadge = async (studentId: string): Promise<void> => {
    const label = badgeLabel.trim();
    if (!label) return;
    setAwardingBadge(true);
    setError('');
    try {
      const res = await fetch(`/api/admin/students/${studentId}/badges`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label }),
      });

      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error || 'No se pudo registrar la insignia');
      }

      setBadgingId(null);
      setBadgeLabel('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al registrar insignia');
    } finally {
      setAwardingBadge(false);
    }
  };

  return (
    <section data-admin-section="families" className="mb-5">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UsersRound className="h-5 w-5 text-pk-primary" aria-hidden />
              Familias y alumnos
            </CardTitle>
            <CardDescription>Alumnos matriculados y contacto del padre/madre.</CardDescription>
          </div>
          <Button type="button" size="sm" onClick={() => setShowForm((v) => !v)}>
            <Plus className="mr-1 h-4 w-4" aria-hidden />
            Agregar alumno
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error ? <p className="text-sm text-red-700">{error}</p> : null}

          {showForm ? (
            <form
              onSubmit={(e) => void handleSubmit(e)}
              className="grid gap-3 rounded-xl border border-pk-border bg-pk-snow p-4 md:grid-cols-2"
            >
              <div>
                <Label htmlFor="student-name">Nombre</Label>
                <Input
                  id="student-name"
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Sofía Ramírez"
                />
              </div>
              <div>
                <Label htmlFor="student-grade">Edad / rango</Label>
                <Input
                  id="student-grade"
                  required
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                  placeholder="4 años o 6–8 años"
                />
              </div>
              <div>
                <Label htmlFor="student-parent-email">Email del padre/madre</Label>
                <Input
                  id="student-parent-email"
                  type="email"
                  value={form.parent_email}
                  onChange={(e) => setForm({ ...form, parent_email: e.target.value })}
                  placeholder="mama@correo.com"
                />
              </div>
              <div>
                <Label htmlFor="student-parent-phone">WhatsApp del padre/madre</Label>
                <Input
                  id="student-parent-phone"
                  value={form.parent_phone}
                  onChange={(e) => setForm({ ...form, parent_phone: e.target.value })}
                  placeholder="+57 300 000 0000"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="student-notes">Notas (opcional)</Label>
                <Input
                  id="student-notes"
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Alergias, observaciones, etc."
                />
              </div>
              <div className="md:col-span-2 flex gap-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar alumno'}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          ) : null}

          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, edad/rango o email del padre/madre…"
          />

          {loading ? (
            <div className="flex items-center gap-2 text-sm text-pk-sub">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Cargando alumnos…
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-pk-sub">
              No hay alumnos que coincidan. Agrega el primero con «Agregar alumno».
            </p>
          ) : (
            <ul className="divide-y divide-pk-border rounded-xl border border-pk-border">
              {filtered.map((student) => {
                const whatsapp = student.parent_phone ? whatsappHref(student.parent_phone) : null;
                return (
                  <li key={student.id} className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-pk-ink">
                          {student.name}{' '}
                          <span className="text-pk-sub">· {formatAgeRange(student.grade)}</span>
                        </p>
                        <p className="text-xs text-pk-sub">{student.parent_email ?? 'Sin email'}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={student.status === 'active' ? 'green' : 'neutral'}>
                          {student.status === 'active' ? 'Activo' : 'Inactivo'}
                        </Badge>
                        {student.parent_email ? (
                          <a href={mailtoHref(student.parent_email)} aria-label="Enviar email">
                            <Button type="button" variant="ghost" size="sm">
                              <Mail className="h-4 w-4" aria-hidden />
                            </Button>
                          </a>
                        ) : null}
                        {whatsapp ? (
                          <a
                            href={whatsapp}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="Abrir WhatsApp"
                          >
                            <Button type="button" variant="ghost" size="sm">
                              <MessageCircle className="h-4 w-4" aria-hidden />
                            </Button>
                          </a>
                        ) : null}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          aria-label="Agregar insignia"
                          onClick={() => {
                            setBadgingId((current) => (current === student.id ? null : student.id));
                            setBadgeLabel('');
                          }}
                        >
                          <Trophy className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          disabled={updatingId === student.id}
                          onClick={() => void toggleStatus(student)}
                        >
                          {updatingId === student.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : student.status === 'active' ? (
                            'Dar de baja'
                          ) : (
                            'Reactivar'
                          )}
                        </Button>
                      </div>
                    </div>
                    {badgingId === student.id ? (
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          value={badgeLabel}
                          onChange={(e) => setBadgeLabel(e.target.value)}
                          placeholder="Ej. Burbujas, Flota solo…"
                          className="max-w-xs"
                        />
                        <Button
                          type="button"
                          size="sm"
                          disabled={awardingBadge || !badgeLabel.trim()}
                          onClick={() => void awardBadge(student.id)}
                        >
                          {awardingBadge ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar'}
                        </Button>
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
