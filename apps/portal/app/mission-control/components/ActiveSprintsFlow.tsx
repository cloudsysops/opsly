"use client";

import {
  Background,
  Controls,
  type Edge,
  Handle,
  MarkerType,
  MiniMap,
  type Node,
  Position,
  ReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import type { NodeProps } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { MouseEvent } from "react";
import useSWR from "swr";

import type { ActiveSprintsPayload, ApiSprint, ApiSprintStep } from "@/lib/mission-control-types";

type StepNodeData = {
  readonly tool: string;
  readonly description: string;
  readonly status: ApiSprintStep["status"];
};

function StepNode(props: NodeProps) {
  const data = props.data as StepNodeData;
  const ring =
    data.status === "pending"
      ? "border-slate-600 bg-slate-900/90"
      : data.status === "running"
        ? "border-emerald-400 bg-emerald-950/40 shadow-[0_0_16px_rgba(52,211,153,0.35)] animate-pulse"
        : data.status === "done"
          ? "border-sky-500 bg-sky-950/30"
          : "border-rose-500 bg-rose-950/40";

  return (
    <div className={`min-w-[160px] max-w-[220px] rounded-lg border px-3 py-2 ${ring}`}>
      <Handle className="!h-2 !w-2 !bg-slate-500" position={Position.Left} type="target" />
      <p className="font-mono text-[10px] uppercase tracking-wide text-slate-500">
        {data.tool}
      </p>
      <p className="mt-1 text-sm leading-snug text-slate-100">{data.description}</p>
      <Handle className="!h-2 !w-2 !bg-slate-500" position={Position.Right} type="source" />
    </div>
  );
}

const nodeTypes = { step: StepNode };

function buildGraph(sprint: ApiSprint): { nodes: Node[]; edges: Edge[] } {
  const steps = [...sprint.steps];
  const nodes: Node[] = steps.map((step, i) => ({
    id: step.id,
    type: "step",
    position: { x: i * 280, y: 20 },
    data: {
      tool: step.tool_name,
      description: step.description,
      status: step.status,
    } satisfies StepNodeData,
  }));

  const edges: Edge[] = [];
  for (let i = 0; i < steps.length - 1; i++) {
    const a = steps[i];
    const b = steps[i + 1];
    if (!a || !b) {
      continue;
    }
    edges.push({
      id: `e-${a.id}-${b.id}`,
      source: a.id,
      target: b.id,
      markerEnd: { type: MarkerType.ArrowClosed, color: "#64748b" },
      style: { stroke: "#475569", strokeWidth: 1.5 },
    });
  }

  return { nodes, edges };
}

async function fetchSprints(
  url: string,
  token: string,
): Promise<ActiveSprintsPayload> {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return (await res.json()) as ActiveSprintsPayload;
}

type InnerProps = {
  readonly accessToken: string;
};

function ActiveSprintsFlowInner({ accessToken }: InnerProps) {
  const swrKey = accessToken
    ? (["/api/sprints/active", accessToken] as const)
    : null;

  const { data, error, isLoading } = useSWR(
    swrKey,
    ([url, token]) => fetchSprints(url, token),
    {
      dedupingInterval: 3_000,
      refreshInterval: 4_000,
      revalidateOnFocus: true,
    },
  );

  const sprints = data?.sprints ?? [];
  const [selectedSprintId, setSelectedSprintId] = useState<string | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  useEffect(() => {
    if (sprints.length > 0 && !selectedSprintId) {
      setSelectedSprintId(sprints[0].id);
    }
  }, [sprints, selectedSprintId]);

  const selectedSprint = useMemo(
    () => sprints.find((s) => s.id === selectedSprintId) ?? null,
    [sprints, selectedSprintId],
  );

  const { nodes, edges } = useMemo(
    () => (selectedSprint ? buildGraph(selectedSprint) : { nodes: [], edges: [] }),
    [selectedSprint],
  );

  const onNodeClick = useCallback((_: MouseEvent, node: Node) => {
    setSelectedStepId(node.id);
  }, []);

  const selectedStep = useMemo(() => {
    if (!selectedSprint || !selectedStepId) {
      return null;
    }
    return selectedSprint.steps.find((s) => s.id === selectedStepId) ?? null;
  }, [selectedSprint, selectedStepId]);

  if (isLoading && !data) {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/60 font-mono text-sm text-slate-500">
        Cargando sprints activos…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 text-center font-mono text-sm text-rose-300">
        {error instanceof Error ? error.message : "Error"}
      </div>
    );
  }

  if (sprints.length === 0) {
    return (
      <p className="py-12 text-center font-mono text-sm text-slate-600">
        No hay sprints activos (planning / running). Lanza un intent
        <code className="mx-1 rounded bg-slate-900 px-1">sprint_plan</code> desde el orquestador.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
          Sprint
        </span>
        {sprints.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSelectedSprintId(s.id);
              setSelectedStepId(null);
            }}
            className={
              "rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors " +
              (selectedSprintId === s.id
                ? "border-cyan-500/50 bg-cyan-950/30 text-cyan-200"
                : "border-slate-700 bg-slate-900/40 text-slate-400 hover:border-slate-500")
            }
          >
            {s.goal.length > 42 ? `${s.goal.slice(0, 39)}…` : s.goal}
          </button>
        ))}
      </div>

      {selectedSprint ? (
        <div className="grid gap-4 lg:grid-cols-[1fr_minmax(220px,280px)]">
          <div className="h-[min(55vh,420px)] min-h-[320px] rounded-2xl border border-slate-800 bg-slate-950">
            <ReactFlow
              defaultEdgeOptions={{ animated: false }}
              edges={edges}
              fitView
              fitViewOptions={{ padding: 0.2 }}
              nodeTypes={nodeTypes}
              nodes={nodes}
              onNodeClick={onNodeClick}
            >
              <Background color="#1e293b" gap={20} />
              <Controls className="!bg-slate-900/90 !border-slate-700" />
              <MiniMap
                className="!bg-slate-900/80"
                maskColor="rgba(15,23,42,0.6)"
                nodeStrokeWidth={2}
              />
            </ReactFlow>
          </div>
          <aside className="rounded-2xl border border-slate-800 bg-slate-900/40 p-4">
            <p className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Detalle del paso
            </p>
            {selectedStep ? (
              <>
                <p className="mt-2 font-mono text-xs text-cyan-400">{selectedStep.tool_name}</p>
                <p className="mt-1 text-sm text-slate-200">{selectedStep.description}</p>
                <p className="mt-3 font-mono text-[10px] uppercase text-slate-500">Estado</p>
                <p className="font-mono text-sm text-slate-300">{selectedStep.status}</p>
                <pre className="mt-3 max-h-48 overflow-auto rounded-lg border border-slate-800 bg-slate-950/80 p-2 font-mono text-[10px] leading-relaxed text-slate-400">
                  {selectedStep.output !== undefined
                    ? JSON.stringify(selectedStep.output, null, 2)
                    : "—"}
                </pre>
              </>
            ) : (
              <p className="mt-4 text-sm text-slate-600">
                Pulsa un nodo para ver salida y estado.
              </p>
            )}
          </aside>
        </div>
      ) : null}

      {data ? (
        <p className="font-mono text-[10px] text-slate-600">
          snapshot {data.generated_at}
        </p>
      ) : null}
    </div>
  );
}

export function ActiveSprintsFlow(props: InnerProps) {
  return (
    <ReactFlowProvider>
      <ActiveSprintsFlowInner {...props} />
    </ReactFlowProvider>
  );
}
