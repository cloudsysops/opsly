"use client";

import { Grid, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useCallback, useMemo, useState } from "react";
import useSWR from "swr";

import {
  apiSprintToAvatar,
  type ActiveSprint,
  type ActiveSprintsPayload,
} from "@/lib/mission-control-types";

import { AgentAvatar } from "./AgentAvatar";

export type VirtualOfficeProps = {
  readonly accessToken: string;
};

function layoutPositions(count: number): [number, number, number][] {
  if (count === 0) {
    return [];
  }
  const spacing = 2.4;
  const start = -((count - 1) * spacing) / 2;
  return Array.from({ length: count }, (_, i) => [start + i * spacing, 0.5, 0]);
}

async function fetchActiveSprints(
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

type OfficeSceneProps = {
  readonly sprints: readonly ActiveSprint[];
  readonly selectedId: string | null;
  readonly onSelect: (id: string) => void;
};

function OfficeScene({ sprints, selectedId, onSelect }: OfficeSceneProps) {
  const positions = useMemo(() => layoutPositions(sprints.length), [sprints.length]);

  return (
    <>
      <color attach="background" args={["#020617"]} />
      <ambientLight intensity={0.5} />
      <directionalLight
        castShadow
        intensity={1.15}
        position={[6, 12, 5]}
        shadow-mapSize={[1024, 1024]}
      />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[18, 18]} />
        <meshStandardMaterial color="#050a12" />
      </mesh>
      <Grid
        args={[18, 18]}
        cellColor="#1e293b"
        cellSize={0.45}
        cellThickness={0.35}
        fadeDistance={24}
        fadeStrength={1}
        infiniteGrid
        position={[0, 0.02, 0]}
        sectionColor="#334155"
        sectionSize={2.5}
        sectionThickness={0.75}
      />
      <OrbitControls
        enableDamping
        enablePan
        maxDistance={17}
        maxPolarAngle={Math.PI / 2.1}
        minDistance={5}
        minPolarAngle={0.4}
      />
      {sprints.map((sprint, i) => (
        <AgentAvatar
          key={sprint.id}
          position={positions[i] ?? [0, 0.5, 0]}
          selected={selectedId === sprint.id}
          sprint={sprint}
          onSelect={() => {
            onSelect(sprint.id);
          }}
        />
      ))}
    </>
  );
}

/**
 * Sala 3D low-poly: sprints activos como avatares (datos desde `/api/sprints/active`).
 */
export function VirtualOffice({ accessToken }: VirtualOfficeProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const swrKey = accessToken
    ? (["/api/sprints/active", accessToken] as const)
    : null;

  const { data, error, isLoading } = useSWR(
    swrKey,
    ([url, token]) => fetchActiveSprints(url, token),
    {
      dedupingInterval: 3_000,
      keepPreviousData: true,
      revalidateOnFocus: true,
    },
  );

  const sprints: ActiveSprint[] = useMemo(
    () => (data?.sprints ?? []).map(apiSprintToAvatar),
    [data?.sprints],
  );

  const clearSelection = useCallback(() => {
    setSelectedId(null);
  }, []);

  if (isLoading && !data) {
    return (
      <div className="flex h-[min(70vh,560px)] w-full items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/80 font-mono text-sm text-slate-500">
        Cargando oficina virtual…
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-[min(70vh,560px)] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-950/20 p-6 text-center">
        <p className="font-mono text-sm text-rose-300">
          {error instanceof Error ? error.message : "Error al cargar sprints"}
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-[min(70vh,560px)] w-full overflow-hidden rounded-2xl border border-slate-800 bg-[#020617] shadow-2xl shadow-black/50">
      <Canvas
        camera={{ fov: 42, position: [0, 3.2, 9], near: 0.1, far: 80 }}
        dpr={[1, 1.75]}
        gl={{ alpha: false, antialias: true, powerPreference: "high-performance" }}
        onPointerMissed={clearSelection}
        shadows
      >
        <Suspense fallback={null}>
          <OfficeScene
            onSelect={setSelectedId}
            selectedId={selectedId}
            sprints={sprints}
          />
        </Suspense>
      </Canvas>
      {sprints.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="rounded-lg border border-slate-700/50 bg-slate-950/70 px-4 py-2 font-mono text-xs text-slate-500">
            No hay sprints activos en esta sala
          </p>
        </div>
      ) : null}
      {data ? (
        <div className="pointer-events-none absolute bottom-3 right-3 rounded border border-slate-800/80 bg-slate-950/80 px-2 py-1 font-mono text-[10px] text-slate-500">
          snapshot {data.generated_at}
        </div>
      ) : null}
    </div>
  );
}
