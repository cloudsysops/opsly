"use client";

import type { ReactElement } from "react";
import { useCallback, useEffect, useState } from "react";
import { getMac2011Monitoring } from "@/lib/api-client";
import type { Mac2011MonitoringStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

function statusBadge(ok: boolean, label: string): ReactElement {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 font-mono text-xs",
        ok
          ? "bg-emerald-950/80 text-emerald-300"
          : "bg-red-950/80 text-red-300",
      )}
    >
      {label}
    </span>
  );
}

function resourceTone(pct: number): "green" | "yellow" | "red" {
  if (pct < 60) {
    return "green";
  }
  if (pct < 80) {
    return "yellow";
  }
  return "red";
}

function ResourceCard(props: {
  title: string;
  value: number;
  unit: string;
  tone: "green" | "yellow" | "red" | "blue";
}): ReactElement {
  const border = {
    green: "border-emerald-900/50 bg-emerald-950/20",
    yellow: "border-amber-900/50 bg-amber-950/20",
    red: "border-red-900/50 bg-red-950/20",
    blue: "border-sky-900/50 bg-sky-950/20",
  }[props.tone];
  const text = {
    green: "text-emerald-300",
    yellow: "text-amber-300",
    red: "text-red-300",
    blue: "text-sky-300",
  }[props.tone];

  return (
    <div className={cn("rounded-lg border p-4", border)}>
      <p className="font-mono text-xs uppercase text-neutral-500">{props.title}</p>
      <p className={cn("mt-2 font-mono text-3xl font-semibold", text)}>
        {props.value.toFixed(1)}
        {props.unit}
      </p>
    </div>
  );
}

export default function Mac2011MonitoringPage(): ReactElement {
  const [data, setData] = useState<Mac2011MonitoringStatus | null>(null);
  const [notConfiguredHint, setNotConfiguredHint] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    setRefreshing(true);
    setError(null);
    setNotConfiguredHint(null);
    try {
      const res = await getMac2011Monitoring();
      if (res.ok) {
        setData(res.data);
      } else {
        setData(null);
        const hint =
          typeof res.body === "object" &&
          res.body !== null &&
          "hint" in res.body &&
          typeof (res.body as { hint?: string }).hint === "string"
            ? (res.body as { hint: string }).hint
            : null;
        const errMsg =
          typeof res.body === "object" &&
          res.body !== null &&
          "error" in res.body &&
          typeof (res.body as { error?: string }).error === "string"
            ? (res.body as { error: string }).error
            : `HTTP ${res.status}`;
        setNotConfiguredHint(hint ?? errMsg);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => void load(), 30_000);
    return () => clearInterval(id);
  }, [load]);

  if (loading && !data && !notConfiguredHint) {
    return (
      <div className="p-8">
        <p className="font-mono text-neutral-400">Cargando…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-xl font-semibold text-ops-green">
            Mac 2011 — monitoreo
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Datos desde{" "}
            <code className="text-neutral-300">mac2011-monitor.sh</code> vía{" "}
            <code className="text-neutral-300">MAC2011_STATUS_URL</code> o{" "}
            <code className="text-neutral-300">MAC2011_STATUS_FILE</code> en la
            API.
          </p>
          {data ? (
            <p className="mt-2 font-mono text-xs text-neutral-500">
              Última muestra: {data.timestamp} · {data.hostname}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          disabled={refreshing}
          onClick={() => void load()}
          className="rounded border border-ops-border bg-ops-border/30 px-4 py-2 font-mono text-sm text-neutral-200 hover:bg-ops-border/50 disabled:opacity-50"
        >
          {refreshing ? "Actualizando…" : "Actualizar"}
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded border border-red-900/50 bg-red-950/30 px-4 py-3 font-mono text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {notConfiguredHint && !data ? (
        <div className="mb-6 rounded border border-amber-900/50 bg-amber-950/20 px-4 py-3 text-sm text-amber-100">
          <p className="font-mono font-semibold text-amber-300">
            API sin fuente de métricas
          </p>
          <p className="mt-2 text-neutral-300">{notConfiguredHint}</p>
        </div>
      ) : null}

      {data ? (
        <>
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
            <ResourceCard
              title="CPU (carga vs cores)"
              value={data.cpu_usage}
              unit="%"
              tone={resourceTone(data.cpu_usage)}
            />
            <ResourceCard
              title="Memoria"
              value={data.memory_usage}
              unit="%"
              tone={resourceTone(data.memory_usage)}
            />
            <ResourceCard
              title="Disco /"
              value={data.disk_usage}
              unit="%"
              tone={resourceTone(data.disk_usage)}
            />
            <ResourceCard
              title="Docker"
              value={data.docker.containers}
              unit=" cont."
              tone="blue"
            />
          </div>

          <div className="mb-8 rounded border border-ops-border bg-ops-surface p-6">
            <h2 className="mb-4 font-mono text-sm font-semibold text-neutral-200">
              Workers
            </h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="flex items-center justify-between rounded border border-ops-border px-4 py-3">
                <span className="text-neutral-300">Ollama</span>
                {statusBadge(
                  data.workers.ollama === "running",
                  data.workers.ollama,
                )}
              </div>
              <div className="flex items-center justify-between rounded border border-ops-border px-4 py-3">
                <span className="text-neutral-300">Worker Opsly</span>
                {statusBadge(
                  data.workers.opsly_worker === "running",
                  data.workers.opsly_worker,
                )}
              </div>
            </div>
          </div>

          <div className="rounded border border-ops-border bg-ops-surface p-6">
            <h2 className="mb-4 font-mono text-sm font-semibold text-neutral-200">
              Red
            </h2>
            <div className="flex items-center justify-between rounded border border-ops-border px-4 py-3">
              <span className="text-neutral-300">VPS (ping Tailscale)</span>
              {statusBadge(
                data.network.vps_connection === "up",
                data.network.vps_connection,
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
