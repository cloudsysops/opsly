'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface EnrollmentRow {
  id: string;
  class_title?: string;
  starts_at?: string;
  status: string;
  payment_status: string;
  behavior_tags?: string[];
  teacher_note?: string | null;
}

const BEHAVIOR_LABELS: Record<string, string> = {
  happy: 'Feliz',
  engaged: 'Participativo',
  calm: 'Tranquilo',
  shy: 'Tímido',
  tired: 'Cansado',
  needs_support: 'Requiere apoyo',
  other: 'Otro',
};

function formatWhen(iso?: string): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function FamilyReservationsClient(): React.ReactElement {
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async (): Promise<void> => {
    setLoading(true);
    try {
      const res = await fetch('/api/portal/enrollments', { credentials: 'include' });
      const json = (await res.json()) as { enrollments?: EnrollmentRow[]; error?: string };
      if (!res.ok) throw new Error(json.error || 'Error');
      setEnrollments(json.enrollments ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar reservas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const handleCancel = async (id: string): Promise<void> => {
    try {
      const res = await fetch(`/api/portal/enrollments/${id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(json.error || 'No se pudo cancelar');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cancelar');
    }
  };

  const handlePay = async (id: string): Promise<void> => {
    try {
      const res = await fetch('/api/payments/checkout', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enrollment_id: id }),
      });
      const json = (await res.json()) as { checkout_url?: string; error?: string };
      if (!res.ok || !json.checkout_url) {
        throw new Error(json.error || 'Pago no disponible');
      }
      window.location.href = json.checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error de pago');
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-pk-ink">Mis reservas</h1>
        <Link href="/familias/clases">
          <Button variant="secondary" size="sm">
            Ver clases
          </Button>
        </Link>
      </div>

      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-pk-sub">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Cargando…
        </div>
      ) : enrollments.length === 0 ? (
        <p className="text-sm text-pk-sub">Aún no tienes reservas.</p>
      ) : (
        <ul className="space-y-3">
          {enrollments.map((row) => (
            <li key={row.id}>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{row.class_title ?? 'Clase'}</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <div className="text-pk-sub">
                    <p>{formatWhen(row.starts_at)}</p>
                    <p>
                      Estado: {row.status} · Pago: {row.payment_status}
                    </p>
                    {row.behavior_tags?.length ? (
                      <p className="mt-1">
                        Clase:{' '}
                        {row.behavior_tags.map((tag) => BEHAVIOR_LABELS[tag] ?? tag).join(' · ')}
                      </p>
                    ) : null}
                    {row.teacher_note ? (
                      <p className="mt-1">Observación: {row.teacher_note}</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    {row.payment_status === 'pending' ? (
                      <Button size="sm" onClick={() => void handlePay(row.id)}>
                        Pagar
                      </Button>
                    ) : null}
                    <Button size="sm" variant="secondary" onClick={() => void handleCancel(row.id)}>
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
