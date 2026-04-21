"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTenantUsageMetrics, getTenants } from "@/lib/api-client";
import type { Tenant, TenantUsageMetricsResponse } from "@/lib/types";

function fmtUsd(n: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 4,
  }).format(n);
}

function percent(n: number): string {
  return `${Math.max(0, Math.min(100, Math.round(n)))}%`;
}

export default function AdminLlmMetricsPage() {
  const [period, setPeriod] = useState<"today" | "month">("today");

  const {
    data: tenantsData,
    error: tenantsError,
    isLoading: tenantsLoading,
  } = useSWR(["tenants", 1], () => getTenants({ page: 1, limit: 100 }), {
    revalidateOnFocus: false,
    refreshInterval: 60_000,
  });

  const tenants = tenantsData?.data ?? [];
  const slugs = useMemo(() => tenants.map((t) => t.slug), [tenants]);

  const {
    data: metricsMap,
    error: metricsError,
    isLoading: metricsLoading,
  } = useSWR(
    ["tenant-usage", period, ...slugs],
    async () => {
      const out: Record<string, TenantUsageMetricsResponse> = {};
      await Promise.all(
        slugs.map(async (slug) => {
          out[slug] = await getTenantUsageMetrics(slug, period);
        }),
      );
      return out;
    },
    { revalidateOnFocus: false, refreshInterval: 60_000 },
  );

  const rows = useMemo(() => {
    const map = metricsMap ?? {};
    return tenants
      .map((t) => ({
        tenant: t,
        usage: map[t.slug],
      }))
      .sort((a, b) => (b.usage?.cost_usd ?? 0) - (a.usage?.cost_usd ?? 0));
  }, [tenants, metricsMap]);

  const total = useMemo(() => {
    const map = metricsMap ?? {};
    return Object.values(map).reduce(
      (acc, cur) => ({
        tokens_input: acc.tokens_input + cur.tokens_input,
        tokens_output: acc.tokens_output + cur.tokens_output,
        cost_usd: acc.cost_usd + cur.cost_usd,
        requests: acc.requests + cur.requests,
        cache_hits: acc.cache_hits + cur.cache_hits,
      }),
      {
        tokens_input: 0,
        tokens_output: 0,
        cost_usd: 0,
        requests: 0,
        cache_hits: 0,
      },
    );
  }, [metricsMap]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-mono text-lg tracking-tight text-ops-green">
          LLM Metrics
        </h1>
        <div className="flex items-center gap-2">
          <button
            className={`rounded border px-3 py-1 font-mono text-xs ${
              period === "today"
                ? "border-ops-green text-ops-green"
                : "border-ops-border text-neutral-300 hover:text-neutral-100"
            }`}
            onClick={() => setPeriod("today")}
          >
            Hoy
          </button>
          <button
            className={`rounded border px-3 py-1 font-mono text-xs ${
              period === "month"
                ? "border-ops-green text-ops-green"
                : "border-ops-border text-neutral-300 hover:text-neutral-100"
            }`}
            onClick={() => setPeriod("month")}
          >
            Mes
          </button>
        </div>
      </div>

      {tenantsError ? (
        <p className="text-sm text-red-400">{String(tenantsError.message)}</p>
      ) : null}
      {metricsError ? (
        <p className="text-sm text-red-400">{String(metricsError.message)}</p>
      ) : null}

      <Card className="border-ops-border bg-ops-surface">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-sm text-neutral-200">
            Totales ({period})
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <Stat label="Requests" value={String(total.requests)} />
          <Stat label="Cache hits" value={String(total.cache_hits)} />
          <Stat
            label="Cache hit rate"
            value={percent(
              total.requests > 0
                ? (total.cache_hits / total.requests) * 100
                : 0,
            )}
          />
          <Stat
            label="Tokens (in/out)"
            value={`${total.tokens_input}/${total.tokens_output}`}
          />
          <Stat label="Cost USD" value={fmtUsd(total.cost_usd)} />
        </CardContent>
      </Card>

      <Card className="border-ops-border bg-ops-surface">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-sm text-neutral-200">
            Por tenant
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tenantsLoading || metricsLoading ? (
            <p className="text-sm text-ops-gray">Cargando…</p>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="border-b border-ops-border/60 text-ops-gray">
                <tr className="font-mono text-[11px] uppercase">
                  <th className="py-2 pr-3">Tenant</th>
                  <th className="py-2 pr-3">Plan</th>
                  <th className="py-2 pr-3">Requests</th>
                  <th className="py-2 pr-3">Cache hit rate</th>
                  <th className="py-2 pr-3">Tokens in/out</th>
                  <th className="py-2 pr-3">Cost USD</th>
                  <th className="py-2 pr-3">Modelo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ tenant, usage }) => (
                  <TenantRow key={tenant.id} tenant={tenant} usage={usage} />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded border border-ops-border/60 p-3">
      <div className="font-mono text-[11px] text-ops-gray">{label}</div>
      <div className="mt-1 font-mono text-sm text-neutral-200">{value}</div>
    </div>
  );
}

function TenantRow({
  tenant,
  usage,
}: Readonly<{
  tenant: Tenant;
  usage: TenantUsageMetricsResponse | undefined;
}>) {
  const cacheHitRate = usage ? usage.cache_hit_rate : 0;
  return (
    <tr className="border-b border-ops-border/40">
      <td className="py-2 pr-3 font-mono text-neutral-200">{tenant.slug}</td>
      <td className="py-2 pr-3">
        <Badge variant="gray" className="font-mono text-[10px]">
          {tenant.plan}
        </Badge>
      </td>
      <td className="py-2 pr-3 font-mono text-neutral-200">
        {usage ? usage.requests : "—"}
      </td>
      <td className="py-2 pr-3 font-mono text-neutral-200">
        {usage ? `${cacheHitRate}%` : "—"}
      </td>
      <td className="py-2 pr-3 font-mono text-neutral-200">
        {usage ? `${usage.tokens_input}/${usage.tokens_output}` : "—"}
      </td>
      <td className="py-2 pr-3 font-mono text-neutral-200">
        {usage ? fmtUsd(usage.cost_usd) : "—"}
      </td>
      <td className="py-2 pr-3 font-mono text-ops-gray">
        {usage?.top_model ?? "—"}
      </td>
    </tr>
  );
}
