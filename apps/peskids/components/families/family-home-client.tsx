'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, Loader2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AgendaItem } from '@/lib/class-types';

interface StudentOption {
  id: string;
  name: string;
}

interface EnrollmentRow {
  id: string;
  status: string;
  payment_status: string;
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

export function FamilyHomeClient(): React.ReactElement {
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const [agendaRes, studentsRes, enrollmentsRes] = await Promise.all([
          fetch('/api/portal/agenda', { credentials: 'include' }),
          fetch('/api/portal/students', { credentials: 'include' }),
          fetch('/api/portal/enrollments', { credentials: 'include' }),
        ]);

        if (!agendaRes.ok || !studentsRes.ok || !enrollmentsRes.ok) {
          throw new Error('Necesitas iniciar sesión para ver tu portal.');
        }

        const agendaJson = (await agendaRes.json()) as { agenda?: AgendaItem[] };
        const studentsJson = (await studentsRes.json()) as { students?: StudentOption[] };
        const enrollmentsJson = (await enrollmentsRes.json()) as { enrollments?: EnrollmentRow[] };

        setAgenda(agendaJson.agenda ?? []);
        setStudents(studentsJson.students ?? []);
        setEnrollments(enrollmentsJson.enrollments ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el portal.');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const upcomingAgenda = useMemo(() => agenda.slice(0, 4), [agenda]);
  const pendingPayments = useMemo(
    () => enrollments.filter((row) => row.payment_status === 'pending').length,
    [enrollments]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-pk-sub">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Cargando portal de familias…
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Portal de familias</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Link href="/familias/login">
              <Button>Entrar al portal</Button>
            </Link>
            <Link href="/">
              <Button variant="secondary">Volver al sitio</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-10">
      <section className="rounded-pk-lg border border-pk-border bg-white p-6 shadow-card sm:p-8">
        <p className="pk-eyebrow">Portal familias</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-pk-ink">
          Tu agenda, tus reservas y el seguimiento de tus hijos en un solo lugar.
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-pk-sub">
          Esta portada usa datos reales de clases, alumnos vinculados y reservas.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/familias/clases">
            <Button>Ver clases disponibles</Button>
          </Link>
          <Link href="/familias/reservas">
            <Button variant="secondary">Ver mis reservas</Button>
          </Link>
          <Link href="/familias/submissions">
            <Button variant="ghost">Ver progreso y entregas</Button>
          </Link>
          <Link href="/familias/forms">
            <Button variant="ghost">Completar formularios</Button>
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <Card accent="teal">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-pk-primary" aria-hidden />
              Alumnos vinculados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-pk-ink">{students.length}</p>
            <p className="mt-2 text-sm text-pk-sub">
              {students.length > 0
                ? students.map((student) => student.name).join(', ')
                : 'Aún no tienes alumnos vinculados.'}
            </p>
          </CardContent>
        </Card>

        <Card accent="amber">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-pk-sun" aria-hidden />
              Próximas clases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-pk-ink">{agenda.length}</p>
            <p className="mt-2 text-sm text-pk-sub">Eventos futuros cargados desde agenda real.</p>
          </CardContent>
        </Card>

        <Card accent="violet">
          <CardHeader>
            <CardTitle className="text-base">Pagos pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-pk-ink">{pendingPayments}</p>
            <p className="mt-2 text-sm text-pk-sub">
              Reservas pendientes por completar o confirmar.
            </p>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Agenda familiar</CardTitle>
          <CardDescription>Próximas clases reservadas o confirmadas por alumno.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {upcomingAgenda.length === 0 ? (
            <p className="text-sm text-pk-sub">No hay clases próximas todavía.</p>
          ) : (
            upcomingAgenda.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-pk-border bg-pk-snow px-4 py-4"
              >
                <div>
                  <p className="font-semibold text-pk-ink">{item.title}</p>
                  <p className="text-sm text-pk-sub">
                    {item.student_name ? `${item.student_name} · ` : ''}
                    {formatClassTime(item.starts_at)}
                  </p>
                </div>
                <div className="text-right text-sm text-pk-sub">
                  <p>
                    Estado:{' '}
                    {(item.enrollment_status ?? item.status) === 'waitlisted'
                      ? 'En lista de espera'
                      : (item.enrollment_status ?? item.status)}
                  </p>
                  <p>Pago: {item.payment_status ?? '—'}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
