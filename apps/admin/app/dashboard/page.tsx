"use client";

import { ActivityChart } from "@/components/dashboard/ActivityChart";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { KpiCard } from "@/components/dashboard/KpiCard";
import { useAuditLog } from "@/hooks/useAuditLog";
import { useFailedTenantCount } from "@/hooks/useFailedTenantCount";
import { useMetrics } from "@/hooks/useMetrics";

function formatUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

export default function DashboardPage() {
  const { data: metrics, error: mErr, isLoading: mLoad } = useMetrics();
  const { data: audit, error: aErr, isLoading: aLoad } = useAuditLog();
  const { count: failedCount, error: fErr } = useFailedTenantCount();

  const agentsEstimate =
    metrics !== undefined ? metrics.active_tenants * 2 : undefined;

  const alerts =
    metrics !== undefined && failedCount !== undefined
      ? failedCount + metrics.suspended_tenants
      : undefined;

  return (
    <div className="space-y-8">
      <h1 className="font-mono text-lg text-ops-green">dashboard</h1>

      {(mErr || fErr) && (
        <div className="rounded border border-ops-red/50 bg-ops-red/10 px-3 py-2 font-sans text-sm text-ops-red">
          {mErr?.message ?? fErr?.message ?? "Error"}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Tenants activos"
          value={mLoad ? "—" : (metrics?.active_tenants ?? 0)}
          color={
            !mLoad && metrics && metrics.active_tenants > 0
              ? "ops-green"
              : "ops-gray"
          }
        />
        <KpiCard
          label="MRR total"
          value={mLoad ? "—" : formatUsd(metrics?.mrr_usd ?? 0)}
          color="ops-green"
        />
        <KpiCard
          label="Agentes (est.)"
          value={mLoad ? "—" : (agentsEstimate ?? 0)}
          unit="n8n+uptime"
          color="ops-yellow"
        />
        <KpiCard
          label="Alertas"
          value={mLoad || failedCount === undefined ? "—" : (alerts ?? 0)}
          unit="failed+suspended"
          color={
            alerts !== undefined && alerts > 0 ? "ops-red" : "ops-gray"
          }
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-2 font-sans text-xs uppercase tracking-wide text-ops-gray">
            Actividad
          </h2>
          <ActivityChart buckets={audit?.buckets} isLoading={aLoad} />
        </div>
        <div>
          <h2 className="mb-2 font-sans text-xs uppercase tracking-wide text-ops-gray">
            Audit log (20)
          </h2>
          <ActivityFeed
            entries={audit?.entries}
            isLoading={aLoad}
            error={aErr}
          />
        </div>
      </div>
    </div>
  );
}
