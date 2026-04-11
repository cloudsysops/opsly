"use client";

import { useCallback, useState } from "react";
import useSWR from "swr";
import { CostCard } from "@/components/costs/CostCard";
import { getAdminCosts, postCostDecision } from "@/lib/api-client";
import type { AdminCostsResponse } from "@/lib/types";

const fetcher = (): Promise<AdminCostsResponse> => getAdminCosts();

export default function CostsPage() {
  const { data, error, isLoading, mutate } = useSWR("admin-costs", fetcher, {
    revalidateOnFocus: true,
  });
  const [actionError, setActionError] = useState<string | null>(null);

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
        <p className="text-red-400">
          No se pudieron cargar los costos. Comprueba la API y el token de
          admin.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ops-text">
          Gestión de costos
        </h1>
        <p className="mt-1 text-ops-muted">
          Control y aprobación de servicios (estimación; no sustituye facturación
          real).
        </p>
      </div>

      {actionError && (
        <p className="mb-4 text-sm text-red-400">{actionError}</p>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-ops-border bg-ops-card p-4">
          <p className="text-sm text-ops-muted">Costo actual mensual</p>
          <p className="font-mono text-3xl font-bold text-ops-text">
            ${data.summary.currentMonthly}
          </p>
        </div>
        <div className="rounded-lg border border-ops-border bg-ops-card p-4">
          <p className="text-sm text-ops-muted">Costo propuesto (aprobadas)</p>
          <p className="font-mono text-3xl font-bold text-blue-400">
            ${data.summary.proposedMonthly}
          </p>
        </div>
        <div className="rounded-lg border border-ops-border bg-ops-card p-4">
          <p className="text-sm text-ops-muted">Ahorro potencial</p>
          <p className="font-mono text-3xl font-bold text-emerald-400">
            ${data.summary.potentialSavings}
          </p>
        </div>
      </div>

      {data.alerts.length > 0 && (
        <div className="mb-8 space-y-2">
          {data.alerts.map((alert) => (
            <div
              key={`${alert.action}-${alert.message}`}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-blue-500/30 bg-blue-500/10 p-4"
            >
              <p className="text-sm text-blue-200">{alert.message}</p>
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
