"use client";

import { useEffect, useState } from "react";

type MetricsJson = {
  success_rate?: number;
  avg_response_time_ms?: number;
  critical_errors?: number;
  test_coverage?: string[];
};

type ApprovalDecisionRow = {
  id: string;
  sandbox_run_id: string;
  deployment_id: string | null;
  status: string;
  confidence: number;
  reasoning: string;
  recommendations: string[] | null;
  metrics: MetricsJson | null;
  model_used: string;
  complexity: string;
  created_at: string;
};

function statusBadgeClass(status: string): string {
  if (status === "APPROVE") {
    return "bg-emerald-500/20 text-emerald-400 border-emerald-500/40";
  }
  if (status === "REJECT") {
    return "bg-red-500/20 text-red-400 border-red-500/40";
  }
  return "bg-amber-500/20 text-amber-400 border-amber-500/40";
}

function statusLabel(status: string): string {
  if (status === "APPROVE") {
    return "✅ APPROVE";
  }
  if (status === "REJECT") {
    return "🔴 REJECT";
  }
  return "⚠️ NEEDS_INFO";
}

export default function ApprovalDecisionsPage() {
  const [decisions, setDecisions] = useState<ApprovalDecisionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/approval-decisions");
        const json = (await res.json()) as {
          decisions?: ApprovalDecisionRow[];
          error?: string;
        };
        if (!res.ok) {
          setError(json.error ?? "Request failed");
          return;
        }
        if (!cancelled) {
          setDecisions(json.decisions ?? []);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown error");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] p-6 text-neutral-100">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-2 font-mono text-2xl font-semibold text-ops-green">
          Approval Gate Decisions
        </h1>
        <p className="mb-8 text-sm text-neutral-500">
          Historial read-only (fase 1). Decisiones Sonnet vía llm-gateway.
        </p>

        {loading ? (
          <p className="text-neutral-400">Cargando…</p>
        ) : null}

        {error ? (
          <div className="rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-red-300">
            {error}
          </div>
        ) : null}

        {!loading && !error && decisions.length === 0 ? (
          <p className="text-neutral-500">No decisions yet.</p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-1">
          {decisions.map((d) => {
            const m = d.metrics ?? {};
            const coverage = Array.isArray(m.test_coverage) ? m.test_coverage : [];
            return (
              <article
                key={d.id}
                className="rounded-lg border border-ops-border bg-ops-surface p-5 shadow-sm"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`rounded border px-2 py-1 font-mono text-xs font-semibold ${statusBadgeClass(d.status)}`}
                  >
                    {statusLabel(d.status)}
                  </span>
                  <span className="font-mono text-[10px] text-neutral-500">
                    {d.sandbox_run_id}
                  </span>
                </div>
                <p className="mb-4 text-sm leading-relaxed text-neutral-300">{d.reasoning}</p>
                <div className="mb-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-4">
                  <div>
                    <div className="text-[10px] uppercase text-neutral-500">Confidence</div>
                    <div className="font-mono text-neutral-200">{d.confidence}%</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-neutral-500">Success rate</div>
                    <div className="font-mono text-neutral-200">
                      {typeof m.success_rate === "number" ? `${m.success_rate}%` : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-neutral-500">Response time</div>
                    <div className="font-mono text-neutral-200">
                      {typeof m.avg_response_time_ms === "number"
                        ? `${m.avg_response_time_ms} ms`
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-neutral-500">Coverage</div>
                    <div className="font-mono text-xs text-neutral-200">
                      {coverage.length > 0 ? coverage.join(", ") : "—"}
                    </div>
                  </div>
                </div>
                {d.recommendations && d.recommendations.length > 0 ? (
                  <ul className="mb-3 list-inside list-disc text-sm text-neutral-400">
                    {d.recommendations.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : null}
                <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-ops-border pt-3 font-mono text-[10px] text-neutral-600">
                  <span>model: {d.model_used}</span>
                  <span>complexity: {d.complexity}</span>
                  <span>
                    {new Date(d.created_at).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
