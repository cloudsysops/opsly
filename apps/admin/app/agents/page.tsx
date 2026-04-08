"use client";

import useSWR from "swr";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTeamMetrics } from "@/lib/api-client";
import type { TeamMetrics } from "@/lib/types";

export default function AdminAgentsPage() {
  const { data, error, isLoading } = useSWR(
    ["teams-metrics"],
    () => getTeamMetrics(),
    { refreshInterval: 60_000, revalidateOnFocus: false },
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-mono text-lg tracking-tight text-ops-green">
          Agent Teams
        </h1>
        <div className="font-mono text-xs text-ops-gray">
          {data?.timestamp
            ? `updated ${new Date(data.timestamp).toLocaleString("es")}`
            : null}
        </div>
      </div>

      {error ? (
        <p className="text-sm text-red-400">{String(error.message)}</p>
      ) : null}
      {isLoading ? <p className="text-sm text-ops-gray">Cargando…</p> : null}

      <Card className="border-ops-border bg-ops-surface">
        <CardHeader className="pb-2">
          <CardTitle className="font-mono text-sm text-neutral-200">
            Capacidad total paralela: {data?.total_parallel_capacity ?? "—"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          {(data?.teams ?? []).map((t) => (
            <TeamCard key={t.name} team={t} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function statusBadge(status: string) {
  if (status === "active")
    return <Badge className="font-mono text-[10px]">active</Badge>;
  if (status === "busy")
    return (
      <Badge variant="gray" className="font-mono text-[10px]">
        busy
      </Badge>
    );
  return (
    <Badge variant="gray" className="font-mono text-[10px]">
      idle
    </Badge>
  );
}

function TeamCard({ team }: Readonly<{ team: TeamMetrics }>) {
  return (
    <div className="rounded border border-ops-border/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-mono text-sm text-neutral-200">{team.name}</div>
        {statusBadge(team.status)}
      </div>
      <div className="mt-2 grid gap-1 font-mono text-xs text-ops-gray">
        <div>specialization: {team.specialization}</div>
        <div>max_parallel: {team.max_parallel}</div>
        <div>handles: {team.handles.join(", ")}</div>
      </div>
      <div className="mt-3 font-mono text-[11px] text-ops-gray">
        queue/active: n/a (endpoint aún no expone jobs)
      </div>
    </div>
  );
}
