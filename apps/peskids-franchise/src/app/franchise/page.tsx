'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type FranchiseStats = {
  totals: {
    leads: number;
    students: number;
    classes: number;
    activeStudents: number;
  };
  byUnit: Array<{
    franchiseId: string;
    slug: string;
    name: string;
    leads: number;
    students: number;
    activeStudents: number;
  }>;
  recentActivity: {
    leadsThisWeek: number;
    studentsThisWeek: number;
    trialsThisWeek: number;
  };
};

type FranchiseLead = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  service_mode: string | null;
  created_at: string;
  franchise_name: string | null;
};

export default function FranchiseDashboardPage() {
  const [stats, setStats] = useState<FranchiseStats | null>(null);
  const [leads, setLeads] = useState<FranchiseLead[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');

  useEffect(() => {
    Promise.all([
      fetch('/api/franchise/stats', { cache: 'no-store' }).then((r) => {
        if (r.status === 401) {
          window.location.href = '/login?callbackUrl=/franchise';
          return null;
        }
        if (r.status === 403) return { error: 'forbidden' };
        if (!r.ok) throw new Error('stats failed');
        return r.json();
      }),
      fetch('/api/franchise/leads?limit=10', { cache: 'no-store' }).then((r) => {
        if (!r.ok) return { leads: [] };
        return r.json();
      }),
    ])
      .then(([statsResult, leadsResult]) => {
        if (!statsResult) return;
        if (statsResult.error === 'forbidden') {
          setState('forbidden');
          return;
        }
        setStats(statsResult);
        setLeads(leadsResult.leads ?? []);
        setState('ready');
      })
      .catch(() => setState('error'));
  }, []);

  if (state === 'loading') {
    return (
      <main className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-slate-200 rounded" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-slate-100 rounded-xl" />
            ))}
          </div>
        </div>
      </main>
    );
  }

  if (state === 'forbidden') {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Acceso denegado</h1>
        <p className="mt-2 text-slate-600">
          No tienes permisos para ver el dashboard de franquicias.
        </p>
      </main>
    );
  }

  if (state === 'error' || !stats) {
    return (
      <main className="p-8">
        <h1 className="text-2xl font-semibold text-slate-900">Error</h1>
        <p className="mt-2 text-slate-600">
          No fue posible cargar el dashboard. Intenta de nuevo.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-brand-navy">Dashboard de Franquicia</h1>
        <p className="mt-1 text-slate-600">Resumen de operaciones por unidad</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Leads totales" value={stats.totals.leads} color="navy" />
        <StatCard label="Estudiantes activos" value={stats.totals.activeStudents} color="green" />
        <StatCard label="Clases" value={stats.totals.classes} color="cyan" />
        <StatCard label="Leads esta semana" value={stats.recentActivity.leadsThisWeek} color="orange" />
      </div>

      {/* Per-unit breakdown */}
      {stats.byUnit.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Por Unidad</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {stats.byUnit.map((unit) => (
              <article
                key={unit.franchiseId}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <h3 className="text-lg font-semibold text-slate-900">{unit.name}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{unit.slug}</p>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase">Leads</div>
                    <div className="text-2xl font-bold text-brand-navy">{unit.leads}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase">Estudiantes</div>
                    <div className="text-2xl font-bold text-brand-green">{unit.students}</div>
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-500 uppercase">Activos</div>
                    <div className="text-2xl font-bold text-brand-cyan">{unit.activeStudents}</div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* Recent leads */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900">Leads Recientes</h2>
          <Link
            href="/franchise/leads"
            className="text-sm text-brand-purple hover:underline"
          >
            Ver todos
          </Link>
        </div>
        {leads.length === 0 ? (
          <p className="text-slate-600">No hay leads recientes.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Nombre</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Estado</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Modalidad</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Unidad</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => (
                  <tr key={lead.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{lead.full_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={lead.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-600">{lead.service_mode ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">{lead.franchise_name ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Date(lead.created_at).toLocaleDateString('es-CO')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'navy' | 'green' | 'cyan' | 'orange';
}) {
  const colorMap = {
    navy: 'text-brand-navy bg-brand-navy/5',
    green: 'text-brand-green bg-brand-green/5',
    cyan: 'text-brand-cyan bg-brand-cyan/5',
    orange: 'text-brand-orange bg-brand-orange/5',
  };
  return (
    <div className={`rounded-xl p-5 ${colorMap[color]}`}>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="text-3xl font-bold mt-1">{value}</div>
    </div>
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
