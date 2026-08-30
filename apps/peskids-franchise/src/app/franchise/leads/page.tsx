'use client';

import { useEffect, useState } from 'react';

type FranchiseLead = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  service_mode: string | null;
  class_modality: string | null;
  neighborhood: string | null;
  created_at: string;
  franchise_id: string | null;
  franchise_name: string | null;
};

type FranchiseUnit = {
  id: string;
  slug: string;
  name: string;
};

const STATUS_OPTIONS = ['new', 'contacted', 'qualified', 'converted', 'lost'] as const;

export default function FranchiseLeadsPage() {
  const [leads, setLeads] = useState<FranchiseLead[]>([]);
  const [units, setUnits] = useState<FranchiseUnit[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(0);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const limit = 25;

  useEffect(() => {
    setState('loading');
    const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
    if (statusFilter) params.set('status', statusFilter);

    Promise.all([
      fetch(`/api/franchise/leads?${params}`, { cache: 'no-store' }).then((r) => {
        if (r.status === 401) {
          window.location.href = '/login?callbackUrl=/franchise/leads';
          return null;
        }
        if (!r.ok) throw new Error('leads failed');
        return r.json();
      }),
      fetch('/api/franchise/units', { cache: 'no-store' }).then((r) => {
        if (!r.ok) return { units: [] };
        return r.json();
      }),
    ])
      .then(([leadsResult, unitsResult]) => {
        if (!leadsResult) return;
        setLeads(leadsResult.leads ?? []);
        setTotal(leadsResult.total ?? 0);
        setUnits(unitsResult.units ?? []);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, [statusFilter, page]);

  const totalPages = Math.ceil(total / limit);

  return (
    <main className="mx-auto max-w-7xl p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-brand-navy">Leads de Franquicia</h1>
        <p className="mt-1 text-slate-600">
          {total} lead{total !== 1 ? 's' : ''} en total
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-brand-purple focus:ring-1 focus:ring-brand-purple"
        >
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>
      </div>

      {state === 'loading' ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      ) : state === 'error' ? (
        <p className="text-red-600">Error al cargar los leads.</p>
      ) : leads.length === 0 ? (
        <p className="text-slate-600">No hay leads con los filtros seleccionados.</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Email</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Teléfono</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Modalidad</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Unidad</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Barrio</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{lead.full_name}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.email ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{lead.service_mode ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.franchise_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.neighborhood ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(lead.created_at).toLocaleDateString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Página {page + 1} de {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: 'bg-blue-100 text-blue-700',
    contacted: 'bg-amber-100 text-amber-700',
    qualified: 'bg-green-100 text-green-700',
    converted: 'bg-emerald-100 text-emerald-700',
    lost: 'bg-red-100 text-red-700',
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? 'bg-slate-100 text-slate-700'}`}
    >
      {status}
    </span>
  );
}
