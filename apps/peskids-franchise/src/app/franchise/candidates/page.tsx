'use client';

import Link from 'next/link';
import { DragEvent, FormEvent, useEffect, useState } from 'react';
import type { CandidateStatus } from '@/lib/candidate-domain';
import { canTransitionCandidate } from '@/lib/candidate-domain';
import type { FranchiseCandidate } from '@/lib/candidate-service';

const COLUMNS: CandidateStatus[] = [
  'lead',
  'qualified',
  'discovery',
  'financial_review',
  'approved',
  'agreement',
  'opening',
];
const LABELS: Record<CandidateStatus, string> = {
  lead: 'Lead',
  qualified: 'Qualified',
  discovery: 'Discovery',
  financial_review: 'Financial review',
  approved: 'Approved',
  agreement: 'Agreement',
  opening: 'Opening',
  active: 'Active',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
};

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<FranchiseCandidate[]>([]);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    displayName: '',
    email: '',
    organizationName: '',
    desiredTerritory: '',
    source: '',
  });
  async function load() {
    const response = await fetch('/api/franchise/candidates', { cache: 'no-store' });
    if (response.status === 401) {
      window.location.href = '/login?callbackUrl=/franchise/candidates';
      return;
    }
    const body = await response.json();
    if (!response.ok) throw new Error(body.error ?? 'Unable to load candidates');
    setCandidates(body.candidates ?? []);
  }
  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, []);
  async function create(event: FormEvent) {
    event.preventDefault();
    setError('');
    const response = await fetch('/api/franchise/candidates', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    });
    const body = await response.json();
    if (!response.ok) return setError(body.error ?? 'Unable to create candidate');
    setForm({ displayName: '', email: '', organizationName: '', desiredTerritory: '', source: '' });
    await load();
  }
  async function drop(event: DragEvent<HTMLElement>, next: CandidateStatus) {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/candidate-id');
    const candidate = candidates.find((item) => item.id === id);
    if (!candidate || !canTransitionCandidate(candidate.status, next))
      return setError(`No se permite ${candidate?.status ?? 'unknown'} → ${next}`);
    const response = await fetch(`/api/franchise/candidates/${id}/transition`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ status: next }),
    });
    const body = await response.json();
    if (!response.ok) return setError(body.error ?? 'Transition rejected');
    setCandidates((items) => items.map((item) => (item.id === id ? body.candidate : item)));
  }
  return (
    <main className="mx-auto max-w-7xl space-y-6 p-8">
      <div>
        <p className="text-sm font-medium text-brand-purple">Peskids · Franquicias</p>
        <h1 className="text-3xl font-semibold text-brand-navy">Candidate pipeline</h1>
        <p className="mt-1 text-slate-600">
          Interés territorial es solo una solicitud; no crea exclusividad.
        </p>
      </div>
      <form
        onSubmit={create}
        className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-6"
      >
        <input
          required
          placeholder="Nombre / empresa"
          value={form.displayName}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          className="rounded border p-2 md:col-span-2"
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded border p-2"
        />
        <input
          placeholder="Territorio de interés"
          value={form.desiredTerritory}
          onChange={(e) => setForm({ ...form, desiredTerritory: e.target.value })}
          className="rounded border p-2"
        />
        <input
          placeholder="Fuente"
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
          className="rounded border p-2"
        />
        <button className="rounded bg-brand-navy px-3 py-2 font-medium text-white">
          Nuevo candidato
        </button>
      </form>
      {error && (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-700">
          {error}
        </p>
      )}
      <div className="grid gap-3 overflow-x-auto md:grid-cols-4 xl:grid-cols-7">
        {COLUMNS.map((status) => (
          <section
            key={status}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => drop(e, status)}
            className="min-h-64 rounded-xl bg-slate-100 p-3"
          >
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              {LABELS[status]}{' '}
              <span className="text-slate-400">
                {candidates.filter((c) => c.status === status).length}
              </span>
            </h2>
            <div className="space-y-2">
              {candidates
                .filter((c) => c.status === status)
                .map((candidate) => (
                  <article
                    key={candidate.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/candidate-id', candidate.id)}
                    className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm"
                  >
                    <Link
                      href={`/franchise/candidates/${candidate.id}`}
                      className="font-medium text-brand-navy hover:underline"
                    >
                      {candidate.displayName}
                    </Link>
                    {candidate.organizationName && (
                      <p className="text-xs text-slate-500">{candidate.organizationName}</p>
                    )}
                    <p className="mt-2 text-xs text-slate-500">
                      {candidate.desiredTerritory || 'Territorio pendiente'}
                    </p>
                  </article>
                ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
