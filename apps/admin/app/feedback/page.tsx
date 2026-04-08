"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  approveFeedbackDecision,
  listFeedback,
  type FeedbackConversationRow,
} from "@/lib/api-client";

function criticalityEmoji(c: string | undefined): string {
  if (c === "critical") return "🚨";
  if (c === "high") return "🔴";
  if (c === "medium") return "🟡";
  if (c === "low") return "🟢";
  return "⚪";
}

export default function FeedbackAdminPage() {
  const [statusFilter, setStatusFilter] = useState<string>("pending_approval");
  const [tenantFilter, setTenantFilter] = useState<string>("");

  const key = useMemo(
    () => ["feedback", statusFilter] as const,
    [statusFilter],
  );

  const { data, error, isLoading, mutate } = useSWR(
    key,
    () =>
      listFeedback({
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 80,
      }),
    { revalidateOnFocus: false },
  );

  const rows = data?.feedbacks ?? [];
  const filtered = tenantFilter.trim()
    ? rows.filter((r) => r.tenant_slug.includes(tenantFilter.trim().toLowerCase()))
    : rows;

  async function onApprove(decisionId: string, approved: boolean) {
    await approveFeedbackDecision({ decision_id: decisionId, approved });
    await mutate();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-mono text-lg tracking-tight text-ops-green">Feedback</h1>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px] font-mono text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending_approval">Pendiente aprobación</SelectItem>
              <SelectItem value="implementing">Implementando</SelectItem>
              <SelectItem value="open">Abierto</SelectItem>
              <SelectItem value="analyzing">Analizando</SelectItem>
              <SelectItem value="done">Hecho</SelectItem>
              <SelectItem value="rejected">Rechazado</SelectItem>
            </SelectContent>
          </Select>
          <input
            type="text"
            placeholder="Filtrar tenant slug…"
            value={tenantFilter}
            onChange={(e) => setTenantFilter(e.target.value)}
            className="h-9 w-[200px] rounded-md border border-ops-border bg-ops-surface px-2 font-mono text-xs text-neutral-200 placeholder:text-ops-gray"
          />
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-400">{String(error.message)}</p>
      ) : null}
      {isLoading ? (
        <p className="text-sm text-ops-gray">Cargando…</p>
      ) : null}

      <div className="grid gap-4">
        {filtered.map((row) => (
          <FeedbackRow key={row.id} row={row} onDecision={onApprove} />
        ))}
      </div>

      {!isLoading && filtered.length === 0 ? (
        <p className="text-sm text-ops-gray">No hay conversaciones con este filtro.</p>
      ) : null}
    </div>
  );
}

function FeedbackRow({
  row,
  onDecision,
}: {
  row: FeedbackConversationRow;
  onDecision: (decisionId: string, approved: boolean) => Promise<void>;
}) {
  const decisions = useMemo(
    () =>
      [...(row.feedback_decisions ?? [])].sort(
        (a, b) =>
          new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime(),
      ),
    [row.feedback_decisions],
  );
  const latest = decisions[0];

  return (
    <Card className="border-ops-border bg-ops-surface">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="font-mono text-sm text-neutral-200">
            {row.tenant_slug} · {row.user_email}
          </CardTitle>
          <Badge className="font-mono text-[10px] uppercase">
            {row.status}
          </Badge>
        </div>
        <p className="font-mono text-[11px] text-ops-gray">
          {new Date(row.created_at).toLocaleString("es")}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {decisions.length === 0 ? (
          <p className="text-sm text-ops-gray">Sin decisiones ML aún.</p>
        ) : (
          decisions.map((d) => (
            <div
              key={d.id ?? d.created_at}
              className="rounded border border-ops-border/60 p-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-lg">{criticalityEmoji(d.criticality)}</span>
                <Badge variant="gray" className="font-mono text-[10px]">
                  {d.decision_type}
                </Badge>
                <span className="text-ops-gray">{d.criticality}</span>
              </div>
              <p className="mt-2 text-neutral-300">{d.reasoning}</p>
              {d.id && row.status === "pending_approval" ? (
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    className="font-mono text-xs"
                    onClick={() => onDecision(d.id as string, true)}
                  >
                    Aprobar → Cursor
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="font-mono text-xs"
                    onClick={() => onDecision(d.id as string, false)}
                  >
                    Rechazar
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
        {latest?.implemented_at ? (
          <p className="font-mono text-[11px] text-ops-green">
            Implementado: {new Date(latest.implemented_at).toLocaleString("es")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
