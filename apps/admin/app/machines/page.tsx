"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getDockerContainers } from "@/lib/api-client";
import type { AdminDockerContainerRow } from "@/lib/types";

const REFRESH_MS = 20_000;

function stateTone(state: string): "green" | "yellow" | "gray" | "red" {
  const s = state.toLowerCase();
  if (s === "running") {
    return "green";
  }
  if (s === "restarting" || s === "paused") {
    return "yellow";
  }
  if (s === "dead" || s === "error") {
    return "red";
  }
  return "gray";
}

function StateBadge({ state }: Readonly<{ state: string }>) {
  const tone = stateTone(state);
  const cls =
    tone === "green"
      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
      : tone === "yellow"
        ? "border-ops-yellow/40 bg-ops-yellow/10 text-ops-yellow"
        : tone === "red"
          ? "border-ops-red/40 bg-ops-red/10 text-ops-red"
          : "border-ops-border bg-ops-border/40 text-ops-gray";
  return (
    <Badge variant="gray" className={`font-mono text-[10px] ${cls}`}>
      {state}
    </Badge>
  );
}

function filterRows(
  rows: AdminDockerContainerRow[],
  q: string,
): AdminDockerContainerRow[] {
  const needle = q.trim().toLowerCase();
  if (needle.length === 0) {
    return rows;
  }
  return rows.filter((r) => {
    const hay = [
      r.id,
      r.image,
      r.state,
      r.status,
      r.names.join(" "),
      r.ports,
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(needle);
  });
}

function countByState(rows: AdminDockerContainerRow[]): Record<string, number> {
  return rows.reduce<Record<string, number>>((acc, r) => {
    const k = r.state.toLowerCase() || "unknown";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

export default function MachinesPage() {
  const [query, setQuery] = useState("");
  const { data, error, isLoading } = useSWR(
    ["admin-docker-containers"],
    () => getDockerContainers(),
    { refreshInterval: REFRESH_MS, revalidateOnFocus: false },
  );

  const filtered = useMemo(
    () => filterRows(data?.containers ?? [], query),
    [data?.containers, query],
  );

  const totals = useMemo(() => countByState(data?.containers ?? []), [data?.containers]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-mono text-lg tracking-tight text-ops-green">
            Máquinas · Docker
          </h1>
          <p className="mt-1 max-w-2xl font-sans text-sm text-ops-gray">
            Contenedores del host donde corre la API (VPS u ordenador local). Misma vista que{" "}
            <code className="rounded bg-ops-border/50 px-1 font-mono text-xs">
              docker ps -a
            </code>
            . Requiere socket Docker montado en el servicio API.
          </p>
        </div>
        <div className="font-mono text-xs text-ops-gray">
          {data?.generated_at
            ? `actualizado ${new Date(data.generated_at).toLocaleString("es")}`
            : null}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-400">{String(error.message)}</p>
      ) : null}

      {data !== undefined && !data.docker_available ? (
        <div className="rounded border border-ops-yellow/40 bg-ops-yellow/10 px-4 py-3 font-sans text-sm text-ops-yellow">
          <p className="font-mono text-xs uppercase tracking-wide">Docker no disponible</p>
          <p className="mt-1 text-neutral-300">{data.error ?? "Sin detalle"}</p>
          <p className="mt-2 text-xs text-ops-gray">
            En local: instala Docker Desktop. En VPS: monta{" "}
            <code className="rounded bg-black/30 px-1">/var/run/docker.sock</code> en el
            servicio <code className="rounded bg-black/30 px-1">app</code> del compose.
          </p>
        </div>
      ) : null}

      {isLoading && data === undefined ? (
        <p className="text-sm text-ops-gray">Cargando contenedores…</p>
      ) : null}

      {data?.docker_available === true ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-ops-border bg-ops-surface">
              <CardHeader className="pb-1">
                <CardTitle className="font-sans text-xs font-normal uppercase text-ops-gray">
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent className="font-mono text-2xl text-neutral-100">
                {data.containers.length}
                {data.truncated ? (
                  <span className="ml-2 text-xs text-ops-yellow">
                    (truncado, límite {data.limit})
                  </span>
                ) : null}
              </CardContent>
            </Card>
            {Object.entries(totals)
              .sort(([a], [b]) => a.localeCompare(b))
              .slice(0, 6)
              .map(([state, n]) => (
                <Card key={state} className="border-ops-border bg-ops-surface">
                  <CardHeader className="pb-1">
                    <CardTitle className="font-sans text-xs font-normal uppercase text-ops-gray">
                      {state}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="font-mono text-2xl text-neutral-100">{n}</CardContent>
                </Card>
              ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              placeholder="Filtrar por nombre, imagen, estado, puertos…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-md border-ops-border bg-ops-surface font-mono text-sm"
            />
            <Link
              href="/dashboard"
              className="font-mono text-xs text-ops-green hover:underline"
            >
              ← Volver al dashboard
            </Link>
          </div>

          <Card className="border-ops-border bg-ops-surface">
            <CardHeader className="pb-2">
              <CardTitle className="font-sans text-xs font-normal uppercase tracking-wide text-ops-gray">
                Contenedores ({filtered.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto p-0">
              <table className="w-full min-w-[720px] text-left font-mono text-xs">
                <thead>
                  <tr className="border-b border-ops-border text-ops-gray">
                    <th className="px-3 py-2 font-normal">Estado</th>
                    <th className="px-3 py-2 font-normal">Nombres</th>
                    <th className="px-3 py-2 font-normal">Imagen</th>
                    <th className="px-3 py-2 font-normal">Puertos</th>
                    <th className="px-3 py-2 font-normal">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-ops-border/50 text-neutral-200"
                    >
                      <td className="px-3 py-2 align-top">
                        <StateBadge state={row.state} />
                      </td>
                      <td className="max-w-[200px] px-3 py-2 align-top break-words">
                        {row.names.join(", ")}
                      </td>
                      <td className="max-w-[220px] px-3 py-2 align-top break-all text-ops-gray">
                        {row.image}
                      </td>
                      <td className="max-w-[160px] px-3 py-2 align-top break-words text-ops-gray">
                        {row.ports.length > 0 ? row.ports : "—"}
                      </td>
                      <td className="px-3 py-2 align-top text-[11px] text-neutral-400">
                        {row.status}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && data.containers.length > 0 ? (
                <p className="px-3 py-4 text-center text-sm text-ops-gray">
                  Ningún contenedor coincide con el filtro.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
