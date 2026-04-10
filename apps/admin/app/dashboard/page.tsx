"use client";

import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { CpuGauge } from "@/components/dashboard/CpuGauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useSystemMetrics } from "@/hooks/useSystemMetrics";

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
    return "bg-[#22c55e]";
  }
  if (pct < 90) {
    return "bg-[#eab308]";
  }
  return "bg-[#ef4444]";
}

export default function DashboardPage() {
  const { data, error, isLoading } = useSystemMetrics();
  const {
    data: auditData,
    error: auditError,
    isLoading: auditLoading,
  } = useAuditLog();

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-mono text-lg tracking-tight text-ops-green">
          Dashboard
        </h1>
        {data?.mock === true ? (
          <span className="rounded border border-ops-yellow/40 bg-ops-yellow/10 px-2 py-1 font-mono text-xs text-ops-yellow">
            datos simulados (Prometheus no alcanzable)
          </span>
        ) : null}
      </div>

      {error ? (
        <div className="rounded border border-ops-red/50 bg-ops-red/10 px-3 py-2 font-sans text-sm text-ops-red">
          {error.message}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="font-sans text-xs font-normal uppercase tracking-wide text-ops-gray">
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

        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="font-sans text-xs font-normal uppercase tracking-wide text-ops-gray">
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
                    <span className="tabular-nums text-neutral-100">
                      {data.ram_used_gb.toFixed(2)} /{" "}
                      {data.ram_total_gb.toFixed(2)} GB
                    </span>
                  </div>
                  <Progress
                    value={ramPct}
                    indicatorClassName={barTone(ramPct)}
                  />
                </div>
                <div>
                  <div className="mb-2 flex justify-between font-mono text-sm">
                    <span className="text-neutral-300">Disco</span>
                    <span className="tabular-nums text-neutral-100">
                      {data.disk_used_gb.toFixed(2)} /{" "}
                      {data.disk_total_gb.toFixed(2)} GB
                    </span>
                  </div>
                  <Progress
                    value={diskPct}
                    indicatorClassName={barTone(diskPct)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="font-sans text-xs font-normal uppercase tracking-wide text-ops-gray">
              Uptime
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl tabular-nums text-neutral-100">
              {isLoading || !data ? "—" : formatUptime(data.uptime_seconds)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="font-sans text-xs font-normal uppercase tracking-wide text-ops-gray">
              Tenants activos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl tabular-nums text-ops-green">
              {isLoading || !data ? "—" : data.active_tenants}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="font-sans text-xs font-normal uppercase tracking-wide text-ops-gray">
              Contenedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-2xl tabular-nums text-neutral-100">
              {isLoading || !data ? "—" : data.containers_running}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="font-sans text-xs font-normal uppercase tracking-wide text-ops-gray">
              Actualización
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm text-neutral-300">
              Cada 30 s vía API → Prometheus
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actividad reciente — audit_log 7 días */}
      <div className="space-y-3">
        <h2 className="font-mono text-xs uppercase tracking-wider text-ops-gray">
          Actividad reciente
        </h2>
        <ActivityChart
          buckets={auditData?.buckets}
          isLoading={auditLoading}
        />
        <ActivityFeed
          entries={auditData?.entries}
          isLoading={auditLoading}
          error={auditError}
        />
      </div>
    </div>
  );
}
