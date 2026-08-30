'use client';

import { useEffect, useState } from 'react';

type FranchiseUnit = {
  id: string;
  slug: string;
  name: string;
  type: string;
  status: string;
  locations: Array<{ name: string; kind: string; city: string | null }>;
};

export default function FranchiseUnitsPage() {
  const [units, setUnits] = useState<FranchiseUnit[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'forbidden' | 'error'>('loading');

  useEffect(() => {
    fetch('/api/franchise/units', { cache: 'no-store' })
      .then(async (response) => {
        if (response.status === 401) {
          window.location.href = '/login?callbackUrl=/franchise/units';
          return null;
        }
        if (response.status === 403) {
          setState('forbidden');
          return null;
        }
        if (!response.ok) throw new Error('Unable to load units');
        return (await response.json()) as { units: FranchiseUnit[] };
      })
      .then((payload) => {
        if (payload) {
          setUnits(payload.units);
          setState('ready');
        }
      })
      .catch(() => setState('error'));
  }, []);

  if (state === 'loading') return <main className="p-8">Cargando unidades…</main>;
  if (state === 'forbidden') return <main className="p-8">Acceso denegado.</main>;
  if (state === 'error') return <main className="p-8">No fue posible cargar las unidades.</main>;

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="text-3xl font-semibold text-brand-navy">Franchise Units</h1>
      <p className="mt-2 text-slate-600">Unidades Peskids asignadas a tu sesión.</p>
      <div className="mt-8 grid gap-4 md:grid-cols-2">
        {units.map((unit) => (
          <article
            key={unit.id}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <h2 className="text-xl font-semibold text-slate-900">{unit.name}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {unit.slug} · {unit.type} · {unit.status}
            </p>
            <p className="mt-4 text-sm text-slate-700">
              {unit.locations
                .map((location) => [location.name, location.city].filter(Boolean).join(' · '))
                .join(', ') || 'Ubicación pendiente'}
            </p>
          </article>
        ))}
      </div>
      {units.length === 0 && <p className="mt-8 text-slate-600">No tienes unidades asignadas.</p>}
    </main>
  );
}
