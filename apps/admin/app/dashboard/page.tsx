'use client';

import { ActivityChart } from '@/components/dashboard/ActivityChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { AIChatAssistant } from '@/components/dashboard/AIChatAssistant';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { CpuGauge } from '@/components/dashboard/CpuGauge';
import { PlatformOverview } from '@/components/dashboard/PlatformOverview';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { TenantSwitcher } from '@/components/dashboard/TenantSwitcher';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Bot, CheckCircle2, Cpu, Database, Radar, Server } from 'lucide-react';
import { useAuditLog } from '@/hooks/useAuditLog';
import { useSystemMetrics } from '@/hooks/useSystemMetrics';

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86_400);
  const h = Math.floor((seconds % 86_400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) {
    return `${d}d ${h}h ${m}m`;
  }
  if (h > 0) {
    return `${h}h ${m}m`;
  }
  return `${m}m`;
}

function barTone(pct: number): string {
  if (pct < 70) {
    return 'bg-[#22c55e]';
  }
  if (pct < 90) {
    return 'bg-[#eab308]';
  }
  return 'bg-[#ef4444]';
}

export default function DashboardPage() {
  const { data, error, isLoading } = useSystemMetrics();
  const { data: auditData, error: auditError, isLoading: auditLoading } = useAuditLog();

  const liveMetrics = data?.mock !== true;
  const ramPct =
    data !== undefined && data.ram_total_gb > 0
      ? Math.min(100, (data.ram_used_gb / data.ram_total_gb) * 100)
      : 0;
  const diskPct =
    data !== undefined && data.disk_total_gb > 0
      ? Math.min(100, (data.disk_used_gb / data.disk_total_gb) * 100)
      : 0;

  return (
    <div className="space-y-8">
      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <Card className="stagger-fade overflow-hidden [animation-delay:20ms]">
          <CardHeader className="border-b-0 p-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <p className="font-sans text-[11px] uppercase tracking-[0.22em] text-ops-gray">
                  Opsly Admin
                </p>
                <h1 className="font-display text-2xl font-semibold tracking-tight text-neutral-100">
                  Control center
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-ops-gray">
                  Estado de tenants, infraestructura, colas y actividad reciente. Solo señales
                  útiles, sin capas de demo.
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <div className="inline-flex items-center gap-2 rounded-full border border-ops-border bg-ops-bg/70 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-ops-cyan">
                  <Radar className="h-3.5 w-3.5" />
                  {liveMetrics ? 'Datos en vivo' : 'Datos simulados'}
                </div>
                <p className="font-mono text-xs text-ops-gray">Actualización cada 30 s</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-ops-border bg-ops-surface/70 p-3">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-ops-gray">
                <Radar className="h-3.5 w-3.5 text-ops-green" />
                Uptime
              </div>
              <div className="font-mono text-2xl tabular-nums text-neutral-100">
                {isLoading || !data ? '—' : formatUptime(data.uptime_seconds)}
              </div>
              <p className="mt-1 text-[11px] text-ops-gray">Tiempo encendido del host</p>
            </div>
            <div className="rounded-xl border border-ops-border bg-ops-surface/70 p-3">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-ops-gray">
                <Cpu className="h-3.5 w-3.5 text-ops-cyan" />
                CPU
              </div>
              <div className="font-mono text-2xl tabular-nums text-neutral-100">
                {isLoading || !data ? '—' : `${data.cpu_percent.toFixed(1)}%`}
              </div>
              <p className="mt-1 text-[11px] text-ops-gray">Carga del VPS principal</p>
            </div>
            <div className="rounded-xl border border-ops-border bg-ops-surface/70 p-3">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-ops-gray">
                <Database className="h-3.5 w-3.5 text-ops-magenta" />
                RAM
              </div>
              <div className="font-mono text-2xl tabular-nums text-neutral-100">
                {isLoading || !data
                  ? '—'
                  : `${data.ram_used_gb.toFixed(1)} / ${data.ram_total_gb.toFixed(1)} GB`}
              </div>
              <p className="mt-1 text-[11px] text-ops-gray">Uso de memoria del host</p>
            </div>
            <div className="rounded-xl border border-ops-border bg-ops-surface/70 p-3">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-ops-gray">
                <Server className="h-3.5 w-3.5 text-ops-green" />
                Tenants
              </div>
              <div className="font-mono text-2xl tabular-nums text-neutral-100">
                {isLoading || !data ? '—' : data.active_tenants}
              </div>
              <p className="mt-1 text-[11px] text-ops-gray">Activos en el control plane</p>
            </div>
            <div className="rounded-xl border border-ops-border bg-ops-surface/70 p-3">
              <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-wide text-ops-gray">
                <CheckCircle2 className="h-3.5 w-3.5 text-ops-yellow" />
                Contenedores
              </div>
              <div className="font-mono text-2xl tabular-nums text-neutral-100">
                {isLoading || !data ? '—' : data.containers_running}
              </div>
              <p className="mt-1 text-[11px] text-ops-gray">Servicios disponibles ahora</p>
            </div>
          </CardContent>
        </Card>

        <TenantSwitcher />
      </section>

      {error ? (
        <div className="holo-border rounded-xl bg-ops-red/15 px-3 py-2 font-sans text-sm text-ops-red">
          {error.message}
        </div>
      ) : null}

      <QuickActions />

      <PlatformOverview />

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <Card className="stagger-fade [animation-delay:60ms]">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-normal tracking-wide text-ops-gray">
                  CPU
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading || !data ? (
                  <div className="flex h-44 items-center justify-center font-mono text-sm text-ops-gray">
                    …
                  </div>
                ) : (
                  <CpuGauge percent={data.cpu_percent} />
                )}
              </CardContent>
            </Card>

            <Card className="stagger-fade [animation-delay:120ms]">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-normal tracking-wide text-ops-gray">
                  Memoria y disco
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {isLoading || !data ? (
                  <div className="font-mono text-sm text-ops-gray">Cargando…</div>
                ) : (
                  <>
                    <div>
                      <div className="mb-2 flex justify-between font-mono text-sm">
                        <span className="text-neutral-300">RAM</span>
                        <span className="digital-readout tabular-nums text-neutral-100">
                          {data.ram_used_gb.toFixed(2)} / {data.ram_total_gb.toFixed(2)} GB
                        </span>
                      </div>
                      <Progress value={ramPct} indicatorClassName={barTone(ramPct)} />
                    </div>
                    <div>
                      <div className="mb-2 flex justify-between font-mono text-sm">
                        <span className="text-neutral-300">Disco</span>
                        <span className="digital-readout tabular-nums text-neutral-100">
                          {data.disk_used_gb.toFixed(2)} / {data.disk_total_gb.toFixed(2)} GB
                        </span>
                      </div>
                      <Progress value={diskPct} indicatorClassName={barTone(diskPct)} />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="stagger-fade [animation-delay:170ms]">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-xs font-normal tracking-wide text-ops-gray">
                <Bot className="h-4 w-4 text-ops-magenta" />
                Actividad reciente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ActivityChart buckets={auditData?.buckets} isLoading={auditLoading} />
              <ActivityFeed
                entries={auditData?.entries}
                isLoading={auditLoading}
                error={auditError}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <AIInsightsPanel
            cpuPercent={data?.cpu_percent ?? 0}
            activeTenants={data?.active_tenants ?? 0}
            containers={data?.containers_running ?? 0}
          />
          <AIChatAssistant />
        </div>
      </section>
    </div>
  );
}
