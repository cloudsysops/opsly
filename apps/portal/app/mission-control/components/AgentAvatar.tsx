"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import type { Group } from "three";

import type { ActiveSprint, SprintAgentStatus } from "@/lib/mission-control-types";

export type AgentAvatarProps = {
  readonly position: readonly [number, number, number];
  readonly sprint: ActiveSprint;
  readonly selected: boolean;
  readonly onSelect: () => void;
};

function statusColor(status: SprintAgentStatus): string {
  if (status === "error") {
    return "#f87171";
  }
  if (status === "working") {
    return "#fbbf24";
  }
  return "#38bdf8";
}

/**
 * Avatar low-poly (caja + visor). Panel HTML al seleccionar.
 */
export function AgentAvatar({
  position,
  sprint,
  selected,
  onSelect,
}: AgentAvatarProps) {
  const groupRef = useRef<Group>(null);
  const baseY = position[1];
  const phase = useMemo(() => Math.random() * Math.PI * 2, []);
  const { status, name } = sprint;

  useFrame((state) => {
    if (status !== "working" || !groupRef.current) {
      return;
    }
    const t = state.clock.elapsedTime + phase;
    groupRef.current.position.y = baseY + Math.sin(t * 2.2) * 0.12;
  });

  const emissive = status === "error" ? "#dc2626" : "#000000";
  const emissiveIntensity = status === "error" ? 0.85 : 0;

  return (
    <group
      ref={groupRef}
      position={[position[0], baseY, position[2]]}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={() => {
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        document.body.style.cursor = "auto";
      }}
    >
      <group scale={selected ? 1.12 : 1}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.65, 0.95, 0.45]} />
          <meshStandardMaterial
            color={statusColor(status)}
            emissive={emissive}
            emissiveIntensity={emissiveIntensity}
            metalness={0.25}
            roughness={0.45}
          />
        </mesh>
        <mesh position={[0, 0.35, 0.26]} castShadow>
          <boxGeometry args={[0.42, 0.22, 0.06]} />
          <meshStandardMaterial
            color="#0f172a"
            emissive="#22d3ee"
            emissiveIntensity={status === "working" ? 0.35 : 0.12}
            metalness={0.5}
            roughness={0.3}
          />
        </mesh>
      </group>

      {selected ? (
        <Html
          position={[0, 1.25, 0]}
          center
          distanceFactor={14}
          style={{ pointerEvents: "auto", width: 280 }}
        >
          <div className="rounded-xl border border-cyan-500/30 bg-slate-950/95 p-3 text-left shadow-2xl shadow-cyan-900/20 backdrop-blur-md">
            <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-500/80">
              Sprint
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-100">{name}</p>
            <p className="mt-2 font-mono text-[11px] text-slate-400">
              Paso actual:{" "}
              <span className="text-cyan-300">{sprint.currentStep}</span>
            </p>
            <div className="mt-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-slate-500">
                Flujo (pipeline)
              </p>
              <div className="mt-1.5 flex flex-wrap gap-1">
                {sprint.steps.map((step) => (
                  <span
                    key={step}
                    className="rounded border border-slate-600/80 bg-slate-900/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-300"
                  >
                    {step}
                  </span>
                ))}
              </div>
            </div>
            <pre className="mt-3 max-h-24 overflow-auto rounded border border-slate-800 bg-slate-900/50 p-2 font-mono text-[10px] leading-snug text-slate-400">
              {sprint.output || "—"}
            </pre>
          </div>
        </Html>
      ) : null}
    </group>
  );
}
