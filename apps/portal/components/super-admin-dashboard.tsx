'use client';

import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  fetchSuperAdminTenants,
  type SuperAdminMetricsPayload,
  type SuperAdminTenantRow,
  type SuperAdminTenantsPayload,
} from '@/lib/admin-api';
import { SuperAdminRevenueChart } from '@/components/super-admin-revenue-chart';

const PAGE_SIZE = 25;

function formatMoney(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n);
}

function planLabel(plan: string): string {
  const p = plan.toLowerCase();
  if (p === 'startup' || p === 'demo') {
    return 'Starter';
  }
  if (p === 'business') {
    return 'Pro';
  }
  if (p === 'enterprise') {
    return 'Enterprise';
  }
  return plan;
}

export function SuperAdminDashboard({
  initialMetrics,
  initialTenants,
  accessToken,
  apiBase,
}: {
  initialMetrics: SuperAdminMetricsPayload;
  initialTenants: SuperAdminTenantsPayload;
  accessToken: string;
  apiBase: string;
}): ReactElement {
  const [tenants, setTenants] = useState<SuperAdminTenantRow[]>(initialTenants.tenants);
  const [total, setTotal] = useState(initialTenants.total);
  const [offset, setOffset] = useState(initialTenants.offset);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(
    async (nextOffset: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetchSuperAdminTenants(accessToken, PAGE_SIZE, nextOffset, apiBase);
        setTenants(res.tenants);
        setTotal(res.total);
        setOffset(res.offset);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar');
      } finally {
        setLoading(false);
      }
    },
    [accessToken, apiBase]
  );

  const revenuePoints = Array.isArray(initialMetrics.revenue_last_months)
    ? initialMetrics.revenue_last_months.map((row) => ({
        month: String(row.month),
        amount: Number(row.amount),
      }))
    : [];

  const canPrev = offset > 0;
  const canNext = offset + tenants.length < total;

  return (
    <div className="space-y-10">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border border-ops-border bg-neutral-950/80 p-6">
          <p className="font-mono text-xs uppercase text-neutral-500">Ingresos brutos (mes)</p>
          <p className="mt-2 font-mono text-2xl text-ops-green">
            {formatMoney(initialMetrics.gross_revenue_month_usd)}
          </p>
        </div>
        <div className="rounded-lg border border-ops-border bg-neutral-950/80 p-6">
          <p className="font-mono text-xs uppercase text-neutral-500">Tenants activos</p>
          <p className="mt-2 font-mono text-2xl text-white">{initialMetrics.active_tenants}</p>
        </div>
        <div className="rounded-lg border border-ops-border bg-neutral-950/80 p-6">
          <p className="font-mono text-xs uppercase text-neutral-500">Jobs en cola (BullMQ)</p>
          <p className="mt-2 font-mono text-2xl text-white">
            {initialMetrics.bullmq_pipeline_jobs}
          </p>
          {!initialMetrics.bullmq.redis_available ? (
            <p className="mt-1 text-xs text-amber-500">Redis no disponible</p>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-ops-border bg-neutral-950/50 p-6">
        <h2 className="mb-4 font-mono text-sm uppercase text-neutral-400">
          Ingresos (últimos 6 meses)
        </h2>
        <SuperAdminRevenueChart data={revenuePoints} />
      </div>

      <div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-mono text-sm uppercase text-neutral-400">Clientes ({total})</h2>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!canPrev || loading}
              onClick={() => void loadPage(Math.max(0, offset - PAGE_SIZE))}
            >
              Anterior
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!canNext || loading}
              onClick={() => void loadPage(offset + PAGE_SIZE)}
            >
              Siguiente
            </Button>
          </div>
        </div>
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <div className="overflow-x-auto rounded-lg border border-ops-border">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-ops-border bg-neutral-900/80 font-mono text-xs uppercase text-neutral-500">
                <th className="px-4 py-3">Tenant</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Gasto mes</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {tenants.map((t) => (
                <tr key={t.id} className="border-b border-ops-border/60 hover:bg-neutral-900/40">
                  <td className="px-4 py-3 font-medium text-white">{t.name}</td>
                  <td className="px-4 py-3 text-neutral-300">{t.owner_email}</td>
                  <td className="px-4 py-3">{planLabel(t.plan)}</td>
                  <td className="px-4 py-3 font-mono">{formatMoney(Number(t.spend_month_usd))}</td>
                  <td className="px-4 py-3">
                    <span
                      className={t.status === 'active' ? 'text-emerald-400' : 'text-neutral-400'}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" size="sm" variant="ghost" disabled title="Próximamente">
                        Suspender
                      </Button>
                      <Button type="button" size="sm" variant="ghost" disabled title="Próximamente">
                        Eliminar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
