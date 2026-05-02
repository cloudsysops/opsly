'use client';

import type { ReactElement } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { demoAdminOverview, getAdminOverview } from '@/lib/api-client';
import type { AdminOverviewResponse } from '@/lib/types';
import { KpiCard } from '@/components/dashboard/KpiCard';

const REFRESH_MS = 30_000;

function fmtUsd(n: number): string {
  return new Intl.NumberFormat('es', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 4,
  }).format(n);
}

function fmtInt(n: number): string {
  return new Intl.NumberFormat('es').format(Math.round(n));
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) {
    return `${d}d ${h}h`;
  }
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

export function PlatformOverview(): React.ReactElement {
  const { data, error } = useSWR<AdminOverviewResponse>(
    ['admin-overview'],
    () => getAdminOverview(),
    { fallbackData: demoAdminOverview(), refreshInterval: REFRESH_MS, revalidateOnFocus: false }
  );
  const overview = data ?? demoAdminOverview();

  if (error) {
    return (
      <div className="rounded border border-ops-red/50 bg-ops-red/10 px-3 py-2 font-sans text-sm text-ops-red">
        Vista plataforma: {error.message}
      </div>
    );
  }

  const { vps_host: vps, local_machine: local, workers, llm } = overview;
  const m = llm.month;
  const t = llm.today;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ops-gray">
          Plataforma · VPS, local, orquestación y LLM
        </h2>
        <span className="font-mono text-[10px] text-ops-gray">
          Actualizado {new Date(overview.generated_at).toLocaleString('es')}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
        <KpiCard label="Respuestas LLM (mes)" value={fmtInt(m.requests)} color="ops-green" />
        <KpiCard
          label="Tokens (mes) in + out"
          value={fmtInt(m.tokens_input + m.tokens_output)}
          color="ops-green"
        />
        <KpiCard label="Coste LLM (mes)" value={fmtUsd(m.cost_usd)} color="ops-yellow" />
        <KpiCard
          label="Ahorro caché (est. mes)"
          value={fmtUsd(llm.savings_estimate_usd_month)}
          color="ops-green"
        />
        <KpiCard label="Hit rate caché (mes)" value={`${m.cache_hit_rate}%`} color="ops-gray" />
        <KpiCard label="Peticiones hoy" value={fmtInt(t.requests)} color="ops-gray" />
      </div>

      <p className="font-sans text-xs leading-relaxed text-ops-gray">{llm.savings_note}</p>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="font-sans text-xs font-normal uppercase tracking-wide text-ops-gray">
              VPS (Prometheus)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-sm text-neutral-200">
            {vps.mock ? <p className="text-ops-yellow">Sin Prometheus · valores demo</p> : null}
            <p>
              <span className="text-ops-gray">CPU </span>
              {vps.cpu_percent.toFixed(1)}%
            </p>
            <p>
              <span className="text-ops-gray">RAM </span>
              {vps.ram_used_gb.toFixed(1)} / {vps.ram_total_gb.toFixed(1)} GB
            </p>
            <p>
              <span className="text-ops-gray">Disco </span>
              {vps.disk_used_gb.toFixed(1)} / {vps.disk_total_gb.toFixed(1)} GB
            </p>
            <p>
              <span className="text-ops-gray">Uptime host </span>
              {formatUptime(vps.uptime_seconds)}
            </p>
            <p>
              <span className="text-ops-gray">Contenedores </span>
              {vps.containers_running}
            </p>
            <p className="pt-1">
              <Link href="/machines" className="text-ops-green underline-offset-4 hover:underline">
                Listado Docker (ps -a) →
              </Link>
            </p>
            <p>
              <span className="text-ops-gray">Tenants activos </span>
              {vps.active_tenants}
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="font-sans text-xs font-normal uppercase tracking-wide text-ops-gray">
              Máquina local (Mac / worker)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-sm text-neutral-200">
            {!overview.local_machine_configured ? (
              <p className="text-ops-gray">
                Sin `MAC2011_STATUS_URL` en la API. Expone el JSON de mac2011-monitor para ver CPU,
                Docker y workers Ollama aquí.
              </p>
            ) : (
              <>
                <p>
                  <span className="text-ops-gray">Host </span>
                  {local?.hostname ?? '—'}
                </p>
                <p>
                  <span className="text-ops-gray">CPU </span>
                  {local?.cpu_usage !== undefined ? `${local.cpu_usage}%` : '—'}
                </p>
                <p>
                  <span className="text-ops-gray">Mem / disco </span>
                  {local?.memory_usage !== undefined ? `${local.memory_usage}%` : '—'} /{' '}
                  {local?.disk_usage !== undefined ? `${local.disk_usage}%` : '—'}
                </p>
                <p>
                  <span className="text-ops-gray">Docker </span>
                  {local?.docker?.containers ?? '—'} cont.
                </p>
                <p>
                  <span className="text-ops-gray">Workers </span>
                  Ollama {local?.workers?.ollama ?? '—'} · opsly{' '}
                  {local?.workers?.opsly_worker ?? '—'}
                </p>
                <p>
                  <span className="text-ops-gray">Red → VPS </span>
                  {local?.network?.vps_connection ?? '—'}
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="font-sans text-xs font-normal uppercase tracking-wide text-ops-gray">
              Redis · BullMQ
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 font-mono text-sm text-neutral-200">
            <p>
              <span className="text-ops-gray">Redis </span>
              {workers.redis_available ? 'conectado' : 'no disponible'}
            </p>
            <p>
              <span className="text-ops-gray">Orquestador (jobs) </span>
              {workers.totals.orchestrator_jobs}
            </p>
            <p>
              <span className="text-ops-gray">Equipos agentes (jobs) </span>
              {workers.totals.agent_team_jobs}
            </p>
            <p>
              <span className="text-ops-gray">En cola / activos </span>
              {workers.totals.all_waiting} / {workers.totals.all_active}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="font-sans text-xs font-normal uppercase tracking-wide text-ops-gray">
            Colas · orquestador y agentes
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left font-mono text-sm">
            <thead>
              <tr className="border-b border-ops-border text-ops-gray">
                <th className="py-2 pr-4 font-normal">Cola</th>
                <th className="py-2 pr-4 font-normal">Rol</th>
                <th className="py-2 pr-4 font-normal">En espera</th>
                <th className="py-2 font-normal">Activos</th>
              </tr>
            </thead>
            <tbody>
              {workers.queues.map((q) => (
                <tr key={q.id} className="border-b border-ops-border/60 text-neutral-200">
                  <td className="py-2 pr-4">{q.label}</td>
                  <td className="py-2 pr-4 text-ops-gray">
                    {q.role === 'orchestrator' ? 'Orquestador' : 'Agentes'}
                  </td>
                  <td className="py-2 pr-4 tabular-nums">{q.waiting}</td>
                  <td className="py-2 tabular-nums">{q.active}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <details className="rounded border border-ops-border bg-ops-surface/50 px-3 py-2 font-sans text-xs text-ops-gray">
        <summary className="cursor-pointer font-mono text-ops-green">Fuentes de datos</summary>
        <ul className="mt-2 list-inside list-disc space-y-1">
          {Object.entries(overview.sources).map(([k, v]) => (
            <li key={k}>
              <span className="text-neutral-400">{k}: </span>
              {v}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
