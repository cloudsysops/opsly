"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CostLineItem } from "@/lib/types";

type CostCardProps = Readonly<{
  service: CostLineItem;
  serviceId: string;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
}>;

function statusBadgeClass(status: CostLineItem["status"]): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "approved":
      return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    case "pending_approval":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "rejected":
      return "bg-red-500/15 text-red-400 border-red-500/30";
    case "available":
      return "bg-purple-500/15 text-purple-400 border-purple-500/30";
    default:
      return "bg-ops-border text-ops-muted border-ops-border";
  }
}

function statusLabel(status: CostLineItem["status"]): string {
  switch (status) {
    case "active":
      return "Activo";
    case "approved":
      return "Aprobado";
    case "pending_approval":
      return "Pendiente";
    case "rejected":
      return "Rechazado";
    case "available":
      return "Disponible";
    default:
      return status;
  }
}

export function CostCard({
  service,
  serviceId,
  onApprove,
  onReject,
}: CostCardProps) {
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  return (
    <Card className="border-ops-border bg-ops-card">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="truncate text-base text-ops-text">
                {service.name}
              </CardTitle>
              <span
                className={`rounded border px-2 py-0.5 text-xs ${statusBadgeClass(
                  service.status
                )}`}
              >
                {statusLabel(service.status)}
              </span>
              {service.requires_credit_card && (
                <span className="rounded bg-orange-500/20 px-2 py-0.5 text-xs text-orange-300">
                  Requiere tarjeta
                </span>
              )}
            </div>
            <p className="mt-1 font-sans text-xs text-ops-muted">
              {service.description}
            </p>
            {service.specs !== undefined && service.specs.length > 0 && (
              <p className="mt-1 font-mono text-[11px] text-neutral-500">
                {service.specs}
              </p>
            )}
            {service.duration && (
              <p className="mt-1 text-xs text-blue-400">⏱ {service.duration}</p>
            )}
            {service.future_cost && (
              <p className="mt-1 text-xs text-orange-300">
                Después: {service.future_cost}
              </p>
            )}
          </div>
          <div className="text-right">
            <p className="font-mono text-2xl font-bold text-ops-text">
              ${service.cost}
            </p>
            <p className="text-xs text-ops-muted">/ {service.period}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        {service.status === "pending_approval" && (
          <div className="flex flex-wrap gap-2">
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              onClick={() => onApprove(serviceId)}
            >
              Aprobar
            </Button>
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => setShowRejectModal(true)}
            >
              Rechazar
            </Button>
          </div>
        )}

        {service.status === "available" && !service.requires_approval && (
          <Button
            className="w-full bg-purple-600 hover:bg-purple-700"
            onClick={() => onApprove(serviceId)}
          >
            Activar (gratis)
          </Button>
        )}

        {service.status === "approved" && (
          <p className="text-center text-sm font-medium text-emerald-400">
            Aprobado — listo para activación operativa (fuera de este panel)
          </p>
        )}

        {showRejectModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-md rounded-lg border border-ops-border bg-ops-card p-6 shadow-xl">
              <h4 className="mb-4 text-lg font-semibold text-ops-text">
                Rechazar servicio
              </h4>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Razón del rechazo (opcional)"
                className="mb-4 w-full rounded border border-ops-border bg-ops-bg p-2 text-sm text-ops-text placeholder:text-ops-muted"
                rows={3}
              />
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {
                    onReject(serviceId, rejectReason);
                    setShowRejectModal(false);
                    setRejectReason("");
                  }}
                >
                  Confirmar rechazo
                </Button>
                <Button
                  variant="default"
                  className="flex-1 border-ops-border"
                  onClick={() => {
                    setShowRejectModal(false);
                    setRejectReason("");
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
