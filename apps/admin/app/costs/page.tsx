"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import { BudgetAlertCard } from "@/components/billing/BudgetAlertCard";
import { LlmBudgetSummaryStrip } from "@/components/billing/LlmBudgetSummaryStrip";
import { TenantBudgetBars } from "@/components/billing/TenantBudgetBars";
import { CostCard } from "@/components/costs/CostCard";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAdminCosts, postCostDecision } from "@/lib/api-client";
import type { AdminCostsResponse } from "@/lib/types";

const fetcher = (): Promise<AdminCostsResponse> => getAdminCosts();

type BudgetFilterValue = "all" | "critical" | "warning" | "ok" | "skipped";
type BudgetSortValue = "percent_desc" | "projected_desc" | "name_asc";

function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function deltaValueClass(value: number): string {
  if (value > 0) {
    return "text-amber-400";
  }
  if (value < 0) {
    return "text-emerald-400";
  }
  return "text-ops-text";
}

export default function CostsPage() {
  const { data, error, isLoading, mutate } = useSWR("admin-costs", fetcher, {
    revalidateOnFocus: true,
  });
  const [actionError, setActionError] = useState<string | null>(null);
  const [budgetQuery, setBudgetQuery] = useState("");
  const [budgetFilter, setBudgetFilter] = useState<BudgetFilterValue>("all");
  const [budgetSort, setBudgetSort] = useState<BudgetSortValue>("percent_desc");

  const handleApprove = useCallback(
    async (serviceId: string) => {
      setActionError(null);
      try {
        await postCostDecision({ service_id: serviceId, action: "approve" });
        await mutate();
      } catch {
        setActionError("No se pudo aprobar el servicio.");
      }
    },
    [mutate]
  );

  const handleReject = useCallback(
    async (serviceId: string, reason: string) => {
      setActionError(null);
      try {
        await postCostDecision({
          service_id: serviceId,
          action: "reject",
          reason: reason.trim() || undefined,
        });
        await mutate();
      } catch {
        setActionError("No se pudo rechazar el servicio.");
      }
    },
    [mutate]
  );

  if (isLoading && !data) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/4 rounded bg-ops-border" />
          <div className="h-4 w-1/2 rounded bg-ops-border" />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 rounded bg-ops-border" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3">
          <p className="text-red-300">
            No se pudieron cargar los costos. Comprueba{" "}
            <code className="text-ops-muted">NEXT_PUBLIC_API_URL</code> y tu
            sesión admin.
          </p>
          <button
            type="button"
            onClick={() => void mutate()}
            className="mt-2 text-sm text-ops-green underline"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const currentCount = Object.keys(data.current).length;
  const deltaMonthly = data.summary.proposedMonthly - data.summary.currentMonthly;
  const updatedLabel =
    data.lastUpdated.length > 0
      ? new Date(data.lastUpdated).toLocaleString()
      : "—";
  const budgetCounts = data.tenant_budgets.reduce(
    (counts, snapshot) => {
      counts.total += 1;
      if (snapshot.enforcement_skipped) {
        counts.skipped += 1;
      }
      if (snapshot.alert_level === "critical") {
        counts.critical += 1;
      } else if (snapshot.alert_level === "warning") {
        counts.warning += 1;
      } else {
        counts.ok += 1;
      }
      return counts;
    },
    { total: 0, critical: 0, warning: 0, ok: 0, skipped: 0 },
  );
  const filteredBudgetSnapshots = useMemo(() => {
    const normalizedQuery = budgetQuery.trim().toLowerCase();

    const matchesFilter = (snapshot: AdminCostsResponse["tenant_budgets"][number]): boolean => {
      switch (budgetFilter) {
        case "critical":
          return snapshot.alert_level === "critical";
        case "warning":
          return snapshot.alert_level === "warning";
        case "ok":
          return snapshot.alert_level === "ok" && !snapshot.enforcement_skipped;
        case "skipped":
          return snapshot.enforcement_skipped;
        default:
          return true;
      }
    };

    const matchesQuery = (snapshot: AdminCostsResponse["tenant_budgets"][number]): boolean => {
      if (normalizedQuery.length === 0) {
        return true;
      }

      return (
        snapshot.tenant_name.toLowerCase().includes(normalizedQuery) ||
        snapshot.tenant_slug.toLowerCase().includes(normalizedQuery)
      );
    };

    const sortedSnapshots = data.tenant_budgets
      .filter((snapshot) => matchesFilter(snapshot) && matchesQuery(snapshot))
      .sort((left, right) => {
        switch (budgetSort) {
          case "name_asc":
            return left.tenant_name.localeCompare(right.tenant_name);
          case "projected_desc":
            return right.projected_month_end_usd - left.projected_month_end_usd;
          case "percent_desc":
          default:
            return right.percent_used - left.percent_used;
        }
      });

    return sortedSnapshots;
  }, [budgetFilter, budgetQuery, budgetSort, data.tenant_budgets]);

  return (
    <div className="mx-auto max-w-7xl p-8">
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-ops-text">
          Gestión de costos
          </h1>
          <p className="mt-1 text-ops-muted">
            Control y aprobación de servicios (estimación; no sustituye facturación
            real). Actualizado: {updatedLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="blue">Tenants LLM: {budgetCounts.total}</Badge>
          <Badge variant="yellow">Riesgo: {budgetCounts.warning}</Badge>
          <Badge variant="red">Críticos: {budgetCounts.critical}</Badge>
          {budgetCounts.skipped > 0 ? (
            <Badge variant="gray">Enforcement omitido: {budgetCounts.skipped}</Badge>
          ) : null}
        </div>
      </div>

      {actionError && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {actionError}
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-lg border border-ops-border bg-ops-card p-4">
          <p className="text-sm text-ops-muted">Costo actual mensual</p>
          <p className="font-mono text-3xl font-bold text-ops-text">
            {formatUsd(data.summary.currentMonthly)}
            <span className="text-lg font-normal text-ops-muted">/mes</span>
          </p>
        </div>
        <div className="rounded-lg border border-ops-border bg-ops-card p-4">
          <p className="text-sm text-ops-muted">Con aprobados</p>
          <p className="font-mono text-3xl font-bold text-blue-400">
            {formatUsd(data.summary.proposedMonthly)}
            <span className="text-lg font-normal text-ops-muted">/mes</span>
          </p>
        </div>
        <div className="rounded-lg border border-ops-border bg-ops-card p-4">
          <p className="text-sm text-ops-muted">Cambio neto si apruebas</p>
          <p className={`font-mono text-3xl font-bold ${deltaValueClass(deltaMonthly)}`}>
            {deltaMonthly >= 0 ? "+" : ""}
            {formatUsd(deltaMonthly)}
          </p>
        </div>
        <div className="rounded-lg border border-ops-border bg-ops-card p-4">
          <p className="text-sm text-ops-muted">Servicios activos (catálogo)</p>
          <p className="font-mono text-3xl font-bold text-emerald-400">
            {currentCount}
          </p>
        </div>
      </div>

      <LlmBudgetSummaryStrip summary={data.llm_budget_summary} />
      <BudgetAlertCard snapshots={data.tenant_budgets} />

      <div className="mb-8">
        <div className="mb-4 flex flex-col gap-4 rounded-lg border border-ops-border bg-ops-card p-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-ops-text">
              Presupuesto LLM por tenant
            </h2>
            <p className="mt-1 text-sm text-ops-muted">
              Prioriza tenants con proyección de sobreconsumo antes de tocar límites o
              activar enforcement.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 lg:min-w-[720px]">
            <div>
              <label
                htmlFor="budget-query"
                className="mb-1 block text-xs font-medium uppercase tracking-wide text-ops-muted"
              >
                Buscar tenant
              </label>
              <Input
                id="budget-query"
                value={budgetQuery}
                onChange={(event) => setBudgetQuery(event.target.value)}
                placeholder="slug o nombre"
              />
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ops-muted">
                Estado
              </span>
              <Select
                value={budgetFilter}
                onValueChange={(value) => setBudgetFilter(value as BudgetFilterValue)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="critical">Criticos</SelectItem>
                  <SelectItem value="warning">Avisos</SelectItem>
                  <SelectItem value="ok">Saludables</SelectItem>
                  <SelectItem value="skipped">Enforcement omitido</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ops-muted">
                Orden
              </span>
              <Select
                value={budgetSort}
                onValueChange={(value) => setBudgetSort(value as BudgetSortValue)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mayor uso" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent_desc">Mayor uso</SelectItem>
                  <SelectItem value="projected_desc">Mayor proyeccion</SelectItem>
                  <SelectItem value="name_asc">Nombre A-Z</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="default">
            Mostrando {filteredBudgetSnapshots.length} de {budgetCounts.total}
          </Badge>
          {budgetFilter !== "all" ? (
            <Badge variant="blue">Filtro: {budgetFilter}</Badge>
          ) : null}
          {budgetQuery.trim().length > 0 ? (
            <Badge variant="gray">Busqueda: {budgetQuery.trim()}</Badge>
          ) : null}
        </div>
        <TenantBudgetBars snapshots={filteredBudgetSnapshots} />
      </div>

      <div className="mb-8 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
        <p className="text-sm font-medium text-blue-200">
          Wallet prepago / tokens
        </p>
        <p className="mt-1 text-xs text-blue-300/90">
          No implementado: requiere ledger y conciliación (ADR-017). Hoy: USD +
          Stripe + límites mensuales.
        </p>
        <a
          href="https://github.com/cloudsysops/opsly/blob/main/docs/WALLET-PREPAID-ROADMAP.md"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-xs text-blue-400 underline"
        >
          Ver roadmap pausado (docs) →
        </a>
      </div>

      {data.alerts.length > 0 && (
        <div className="mb-8 space-y-2">
          {data.alerts.map((alert) => (
            <div
              key={`${alert.action}-${alert.message}`}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-lg border p-4 ${
                alert.level === "warning"
                  ? "border-amber-500/40 bg-amber-500/10"
                  : "border-blue-500/30 bg-blue-500/10"
              }`}
            >
              <p
                className={`text-sm ${
                  alert.level === "warning" ? "text-amber-200" : "text-blue-200"
                }`}
              >
                {alert.level === "warning" ? "⚠ " : "ℹ "}
                {alert.message}
              </p>
              {alert.action === "enable_mac2011_worker" && (
                <button
                  type="button"
                  onClick={() => void handleApprove("mac2011_worker")}
                  className="rounded bg-purple-600 px-4 py-1 text-sm text-white hover:bg-purple-700"
                >
                  Activar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold text-ops-text">
          Servicios activos
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(data.current).map(([id, service]) => (
            <CostCard
              key={id}
              serviceId={id}
              service={service}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      </div>

      <div>
        <h2 className="mb-4 text-xl font-semibold text-ops-text">
          Disponibles / pendientes
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Object.entries(data.proposed).map(([id, service]) => (
            <CostCard
              key={id}
              serviceId={id}
              service={service}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
        <p className="text-sm text-amber-200">
          <strong className="text-amber-100">Importante:</strong> ningún
          servicio con costo se activa automáticamente; las aprobaciones aquí son
          registro operativo. El estado se reinicia al reiniciar la API salvo
          persistencia futura.
        </p>
      </div>
    </div>
  );
}
