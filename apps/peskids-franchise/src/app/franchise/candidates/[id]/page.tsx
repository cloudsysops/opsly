'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { CandidateEvent, FranchiseCandidate } from '@/lib/candidate-service';

export default function CandidateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [candidate, setCandidate] = useState<FranchiseCandidate | null>(null);
  const [events, setEvents] = useState<CandidateEvent[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    params.then(({ id }) =>
      fetch(`/api/franchise/candidates/${id}`, { cache: 'no-store' })
        .then(async (response) => {
          const body = await response.json();
          if (!response.ok) throw new Error(body.error);
          setCandidate(body.candidate);
          setEvents(body.events ?? []);
        })
        .catch((e) => setError(e.message))
    );
  }, [params]);
  if (error) return <main className="p-8 text-red-700">{error}</main>;
  if (!candidate) return <main className="p-8">Cargando candidato…</main>;
  return (
    <main className="mx-auto max-w-3xl space-y-6 p-8">
      <Link href="/franchise/candidates" className="text-sm text-brand-purple">
        ← Pipeline
      </Link>
      <div>
        <h1 className="text-3xl font-semibold text-brand-navy">{candidate.displayName}</h1>
        <p className="text-slate-600">Estado: {candidate.status}</p>
      </div>
      <dl className="grid gap-4 rounded-xl border border-slate-200 bg-white p-5 md:grid-cols-2">
        <div>
          <dt className="text-xs uppercase text-slate-500">Organización</dt>
          <dd>{candidate.organizationName || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Email</dt>
          <dd>{candidate.email || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Teléfono</dt>
          <dd>{candidate.phone || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Territorio de interés</dt>
          <dd>{candidate.desiredTerritory || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Fuente</dt>
          <dd>{candidate.source || '—'}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase text-slate-500">Asignado a</dt>
          <dd>{candidate.assignedTo || 'Sin asignar'}</dd>
        </div>
      </dl>
      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        El territorio indicado es interés comercial, no exclusividad legal. La siguiente etapa
        después de convertir es revisión territorial, acuerdo y apertura.
      </div>
      {candidate.status === 'approved' && !candidate.proposedUnitId && (
        <button
          onClick={async () => {
            const response = await fetch(`/api/franchise/candidates/${candidate.id}/convert`, {
              method: 'POST',
            });
            const body = await response.json();
            if (!response.ok) return setError(body.error);
            setCandidate({
              ...candidate,
              status: 'agreement',
              franchiseeId: body.conversion.franchiseeId,
              proposedUnitId: body.conversion.proposedUnitId,
            });
          }}
          className="rounded bg-brand-purple px-4 py-2 font-medium text-white"
        >
          Convertir a franquiciado
        </button>
      )}
      {candidate.proposedUnitId && (
        <p className="rounded bg-emerald-50 p-3 text-emerald-800">
          Franquiciado creado. Unidad propuesta: {candidate.proposedUnitId}. Estado: no activa.
        </p>
      )}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="font-semibold text-brand-navy">Actividad</h2>
        <ul className="mt-3 space-y-2 text-sm text-slate-600">
          {events.map((event) => (
            <li key={event.id}>
              {event.eventType} · {new Date(event.createdAt).toLocaleString('es-CO')}
            </li>
          ))}
        </ul>
      </section>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
    </main>
  );
}
