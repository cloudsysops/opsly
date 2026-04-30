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
    `${baseUrl}/api/admin/mission-control/teams`,
    fetcher,
    { refreshInterval: 8000 }
  );

  const { data: orchestratorData } = useSWR<OrchestratorStatus>(
    `${baseUrl}/api/admin/mission-control/orchestrator`,
    fetcher,
    { refreshInterval: 4000 }
  );

  const { data: openClawData } = useSWR<OpenClawSnapshot>(
    `${baseUrl}/api/admin/mission-control/openclaw`,
    fetcher,
    { refreshInterval: 3000 }
  );

  const teams = teamsData?.teams ?? [];

  return (
    <div className="min-h-screen bg-ops-bg p-6 text-neutral-100">
      <div className="mx-auto max-w-[1400px] space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ops-border pb-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-ops-gray">
              Mission Control
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-neutral-100">Office</h1>
            <p className="mt-1 max-w-xl text-sm text-neutral-500">
              Mapa HQ en tiempo casi real (polling). Cola BullMQ, equipos, intents OpenClaw y alertas
              de política. Modo Phaser / WebSocket en sprints posteriores.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/mission-control"
              className="rounded border border-ops-border bg-ops-surface px-3 py-2 font-mono text-xs text-ops-green hover:bg-ops-border/40"
            >
              ← Classic board
            </Link>
          </div>
        </div>

        <OfficeCanvas orchestrator={orchestratorData} teams={teams} openClaw={openClawData} />

        <p className="text-center font-mono text-[10px] text-neutral-600">
          Datos: GET /api/admin/mission-control/&#123;teams,orchestrator,openclaw&#125; · Redis queue
          lengths
        </p>
      </div>
    </div>
  );
}
