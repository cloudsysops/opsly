'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ClassListItem } from '@/lib/class-types';

interface StudentOption {
  id: string;
  name: string;
}

function formatClassTime(iso: string): string {
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
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

export function FamilyClassesClient(): React.ReactElement {
  const [classes, setClasses] = useState<ClassListItem[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const [classesRes, studentsRes] = await Promise.all([
          fetch('/api/portal/classes', { credentials: 'include' }),
          fetch('/api/portal/students', { credentials: 'include' }),
        ]);

        if (classesRes.ok) {
          const json = (await classesRes.json()) as { classes?: ClassListItem[] };
          setClasses(json.classes ?? []);
        }

        if (studentsRes.ok) {
          const json = (await studentsRes.json()) as { students?: StudentOption[] };
          const list = json.students ?? [];
          setStudents(list);
          if (list[0]) setSelectedStudent(list[0].id);
        }
      } catch {
        setError('No se pudieron cargar las clases.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const handleReserve = async (classId: string): Promise<void> => {
    if (!selectedStudent) {
      setError('Selecciona un estudiante.');
      return;
    }

    setBookingId(classId);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/portal/enrollments', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_id: classId, student_id: selectedStudent }),
      });

      const json = (await res.json()) as {
        error?: string;
        checkout_url?: string | null;
        message?: string;
      };

      if (!res.ok) {
        throw new Error(json.error || 'No se pudo reservar');
      }

      if (json.checkout_url) {
        window.location.href = json.checkout_url;
        return;
      }

      setMessage(json.message ?? 'Reserva confirmada.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al reservar');
    } finally {
      setBookingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-pk-sub">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Cargando clases disponibles…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-pk-ink">Clases disponibles</h1>
          <p className="text-sm text-pk-sub">Reserva para tu hijo/a con cupos en tiempo real.</p>
        </div>
        <Link href="/familias/reservas">
          <Button variant="secondary" size="sm">
            Mis reservas
          </Button>
        </Link>
      </div>

      {students.length > 0 ? (
        <div>
          <label htmlFor="student-select" className="text-sm font-medium text-pk-ink">
            Estudiante
          </label>
          <select
            id="student-select"
            className="mt-1 h-10 w-full max-w-md rounded-lg border border-pk-border bg-white px-3 text-sm"
            value={selectedStudent}
            onChange={(e) => setSelectedStudent(e.target.value)}
          >
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="text-sm text-amber-800">
          No encontramos estudiantes vinculados a tu cuenta. Contacta a Peskids para activar el
          acceso.
        </p>
      )}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {message ? <p className="text-sm text-green-800">{message}</p> : null}

      {classes.length === 0 ? (
        <p className="text-sm text-pk-sub">No hay clases abiertas por ahora.</p>
      ) : (
        <ul className="space-y-3">
          {classes.map((item) => (
            <li key={item.id}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">{item.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-pk-sub">
                    <p>{formatClassTime(item.starts_at)}</p>
                    <p>
                      Cupos: {item.enrolled_count}/{item.capacity} · {formatCop(item.price_cents)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    disabled={bookingId === item.id || !selectedStudent}
                    onClick={() => void handleReserve(item.id)}
                  >
                    {bookingId === item.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Reservar'
                    )}
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
