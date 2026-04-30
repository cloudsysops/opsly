'use client';

import { ActivityChart } from '@/components/dashboard/ActivityChart';
import { ActivityFeed } from '@/components/dashboard/ActivityFeed';
import { AIChatAssistant } from '@/components/dashboard/AIChatAssistant';
import { AIInsightsPanel } from '@/components/dashboard/AIInsightsPanel';
import { HackerNotificationModal } from '@/components/dashboard/HackerNotificationModal';
import { CpuGauge } from '@/components/dashboard/CpuGauge';
import { PlatformOverview } from '@/components/dashboard/PlatformOverview';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Bot, Radar, Sparkles } from 'lucide-react';
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
      <HackerNotificationModal />
      <QuickActions />

      <div className="stagger-fade flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 data-text="CYBERPUNK CONTROL DECK" className="glitch-text font-display text-2xl text-ops-cyan">
            CYBERPUNK CONTROL DECK
          </h1>
          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-ops-magenta">
            Neural Operations Matrix
          </p>
        </div>
        <div className="holo-border flex items-center gap-3 rounded-xl bg-ops-bg/50 px-3 py-2 text-xs text-ops-cyan">
          <Radar className="h-4 w-4 animate-pulse-dot" />
          <span className="digital-readout">NEURAL SYNC ACTIVE</span>
          <Sparkles className="h-4 w-4 animate-neon-flicker text-ops-magenta" />
        </div>
        {data?.mock === true ? (
          <span className="holo-border rounded-lg bg-ops-yellow/10 px-2 py-1 font-mono text-xs text-ops-yellow">
            datos simulados (Prometheus no alcanzable)
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="holo-border rounded-xl bg-ops-red/15 px-3 py-2 font-sans text-sm text-ops-red">
          {error.message}
        </div>
      ) : null}

      <PlatformOverview />
      <AIInsightsPanel
        cpuPercent={data?.cpu_percent ?? 0}
        activeTenants={data?.active_tenants ?? 0}
        containers={data?.containers_running ?? 0}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="stagger-fade lg:col-span-1 [animation-delay:60ms]">
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

        <Card className="stagger-fade lg:col-span-2 [animation-delay:120ms]">
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

      <div className="data-stream-links grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="stagger-fade [animation-delay:170ms]">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-normal tracking-wide text-ops-gray">
              Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="digital-readout text-2xl tabular-nums text-neutral-100">
              {isLoading || !data ? '—' : formatUptime(data.uptime_seconds)}
            </p>
          </CardContent>
        </Card>
        <Card className="stagger-fade [animation-delay:210ms]">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-normal tracking-wide text-ops-gray">
              Tenants activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="digital-readout text-2xl tabular-nums text-ops-cyan">
              {isLoading || !data ? '—' : data.active_tenants}
            </p>
          </CardContent>
        </Card>
        <Card className="stagger-fade [animation-delay:260ms]">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-normal tracking-wide text-ops-gray">
              Contenedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="digital-readout text-2xl tabular-nums text-neutral-100">
              {isLoading || !data ? '—' : data.containers_running}
            </p>
          </CardContent>
        </Card>
        <Card className="stagger-fade [animation-delay:310ms]">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-normal tracking-wide text-ops-gray">
              Actualización
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm text-neutral-300">Cada 30 s vía API → Prometheus</p>
          </CardContent>
        </Card>
      </div>

      <div className="data-stream-links grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        {/* Actividad reciente — audit_log 7 días */}
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 font-display text-xs tracking-[0.18em] text-ops-gray">
            <Bot className="h-4 w-4 text-ops-magenta" />
            Actividad + análisis predictivo
          </h2>
          <ActivityChart buckets={auditData?.buckets} isLoading={auditLoading} />
          <ActivityFeed entries={auditData?.entries} isLoading={auditLoading} error={auditError} />
        </div>
        <AIChatAssistant />
      </div>
    </div>
  );
}
