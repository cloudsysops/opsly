'use client';

import Link from 'next/link';
import useSWR from 'swr';
import { useMemo } from 'react';

import { OfficeCanvas } from '@/components/mission-control/office-canvas';
import { getBaseUrl } from '@/lib/api-client';
import type {
  AgentTeamsResponse,
  OpenClawSnapshot,
  OrchestratorStatus,
} from '@/lib/mission-control-types';

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function MissionControlOfficePage() {
  const baseUrl = useMemo(() => getBaseUrl(), []);

  const { data: teamsData } = useSWR<AgentTeamsResponse>(
    baseUrl + '/api/admin/mission-control/teams',
    fetcher,
    { refreshInterval: 5000 },
  );

  const { data: orchestratorData } = useSWR<OrchestratorStatus>(
    baseUrl + '/api/admin/mission-control/orchestrator',
    fetcher,
    { refreshInterval: 4000 },
  );

  const { data: openClawData } = useSWR<OpenClawSnapshot>(
    baseUrl + '/api/admin/mission-control/openclaw',
    fetcher,
    { refreshInterval: 3000 },
  );

  const teams = teamsData?.teams ?? [];
  const running = teams.filter((team) => {
    const status = team.status.toLowerCase();
    return status === 'working' || status === 'busy' || status === 'running';
  }).length;
  const queue = orchestratorData?.queue;

  return (
    <div className="min-h-screen bg-[#05070c] p-4 text-neutral-100 lg:p-6">
      <div className="mx-auto max-w-[1600px] space-y-4">
        <header className="overflow-hidden rounded-xl border border-cyan-500/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,.10),transparent_38%),rgba(2,6,23,.92)] p-4">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-cyan-400/70">
                Mission Control / Agent Office
              </p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">
                OpenClaw-style live HQ
              </h1>
              <p className="mt-1 max-w-3xl text-sm text-neutral-500">
                Visualiza agentes, estaciones, tareas, cola y Build Council con evidencia real.
                Un agente solo aparece activo cuando la telemetría lo respalda.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link href="/mission-control" className="rounded-lg border border-cyan-500/25 bg-cyan-500/5 px-3 py-2 font-mono text-xs text-cyan-300 hover:border-cyan-400/60">
                Command Deck
              </Link>
              <Link href="/mission-control/workstreams" className="rounded-lg border border-violet-500/25 bg-violet-500/5 px-3 py-2 font-mono text-xs text-violet-300 hover:border-violet-400/60">
                Workstreams
              </Link>
              <Link href="/mission-control/system" className="rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 font-mono text-xs text-slate-300 hover:border-slate-500">
                System
              </Link>
              <Link href="/openclaw/ide" className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 px-3 py-2 font-mono text-xs text-emerald-300 hover:border-emerald-400/60">
                OpenClaw IDE
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-4">
            <div className="rounded-lg border border-slate-800 bg-black/25 p-2">
              <div className="text-[9px] uppercase tracking-[0.13em] text-slate-600">agents</div>
              <div className="mt-1 font-mono text-sm text-cyan-200">{teams.length}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-black/25 p-2">
              <div className="text-[9px] uppercase tracking-[0.13em] text-slate-600">running</div>
              <div className="mt-1 font-mono text-sm text-emerald-300">{running}</div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-black/25 p-2">
              <div className="text-[9px] uppercase tracking-[0.13em] text-slate-600">queue</div>
              <div className="mt-1 font-mono text-sm text-violet-300">
                {queue ? queue.waiting + queue.active : 'UNKNOWN'}
              </div>
            </div>
            <div className="rounded-lg border border-slate-800 bg-black/25 p-2">
              <div className="text-[9px] uppercase tracking-[0.13em] text-slate-600">openclaw intents</div>
              <div className="mt-1 font-mono text-sm text-amber-300">
                {openClawData?.intents_in_progress.length ?? 'UNKNOWN'}
              </div>
            </div>
          </div>
        </header>

        <OfficeCanvas orchestrator={orchestratorData} teams={teams} openClaw={openClawData} />

        <p className="text-center font-mono text-[9px] uppercase tracking-[0.12em] text-neutral-700">
          Sources: Mission Control teams · orchestrator · OpenClaw · Redis queue evidence
        </p>
      </div>
    </div>
  );
}
