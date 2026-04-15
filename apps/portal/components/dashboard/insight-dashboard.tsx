"use client";

import type { ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getApiBaseUrl } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { portalTenantInsightsUrl } from "@/lib/portal-api-paths";
import type { PortalInsightItem } from "@/types";

type Props = {
  tenantSlug: string;
  insights: PortalInsightItem[];
};

function insightLabel(type: string): string {
  if (type === "churn_risk") return "Riesgo de desinterés";
  if (type === "revenue_forecast") return "Tendencia gasto IA";
  if (type === "usage_anomaly") return "Anomalía de uso";
  return type;
}

export function InsightDashboard({ tenantSlug, insights: initial }: Props): ReactElement {
  const [insights, setInsights] = useState(initial);
  const [busyId, setBusyId] = useState<string | null>(null);

  const chartData = useMemo(() => {
    return insights.map((i) => ({
      name: insightLabel(i.insight_type),
      impacto: i.impact_score,
      confianza: Math.round(i.confidence * 100),
    }));
  }, [insights]);

  const patch = useCallback(
    async (insightId: string, action: "read" | "dismiss" | "action") => {
      setBusyId(insightId);
      try {
        const supabase = createClient();
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session?.access_token) {
          return;
        }
        const url = portalTenantInsightsUrl(getApiBaseUrl(), tenantSlug);
        const res = await fetch(url, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            insight_id: insightId,
            action: action === "action" ? "action" : action,
          }),
        });
        if (!res.ok) {
          return;
        }
        if (action === "dismiss" || action === "action") {
          setInsights((prev) => prev.filter((x) => x.id !== insightId));
        } else {
          setInsights((prev) =>
            prev.map((x) =>
              x.id === insightId ? { ...x, read_at: new Date().toISOString() } : x,
            ),
          );
        }
      } finally {
        setBusyId(null);
      }
    },
    [tenantSlug],
  );

  if (insights.length === 0) {
    return (
      <section className="space-y-3 rounded-lg border border-ops-border bg-ops-surface p-4">
        <h2 className="text-sm font-semibold text-ops-gray">Inteligencia predictiva</h2>
        <p className="text-sm text-neutral-400">
          Aún no hay insights. Tras registrar uso de IA, el job diario puede generar alertas de
          tendencia y anomalías.
        </p>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-lg border border-ops-border bg-ops-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ops-gray">Inteligencia predictiva</h2>
        <p className="text-xs text-neutral-500">
          Heurísticas locales sobre tus eventos de uso (sin LLM obligatorio).
        </p>
      </div>

      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: "#a3a3a3", fontSize: 10 }} />
            <YAxis tick={{ fill: "#a3a3a3", fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: "#171717", border: "1px solid #262626" }}
              labelStyle={{ color: "#e5e5e5" }}
            />
            <Bar dataKey="impacto" fill="#22c55e" name="Impacto" radius={[4, 4, 0, 0]} />
            <Bar dataKey="confianza" fill="#3b82f6" name="Confianza %" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <ul className="space-y-3">
        {insights.map((insight) => (
          <li
            key={insight.id}
            className="rounded-md border border-ops-border/80 bg-black/20 p-3 text-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-medium text-neutral-100">{insight.title}</p>
                <p className="mt-1 text-neutral-400">{insight.summary}</p>
                <p className="mt-2 text-xs text-ops-gray">
                  Confianza {(insight.confidence * 100).toFixed(0)}% · Impacto{" "}
                  {insight.impact_score}
                  {insight.read_at ? " · Leído" : ""}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="rounded border border-ops-border px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                  disabled={busyId === insight.id || insight.read_at !== null}
                  onClick={() => void patch(insight.id, "read")}
                >
                  Marcar leído
                </button>
                <button
                  type="button"
                  className="rounded border border-ops-border px-2 py-1 text-xs text-neutral-300 hover:bg-neutral-800 disabled:opacity-50"
                  disabled={busyId === insight.id}
                  onClick={() => void patch(insight.id, "dismiss")}
                >
                  Descartar
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
