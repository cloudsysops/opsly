/**
 * Map team/queue signals to a Moon task read-model.
 * Does NOT invent AgentTaskEnvelopeV1 — uses existing TeamMetrics shape.
 */

import type { TeamMetrics } from '@/lib/types';

export type MoonTaskStatus =
  | 'idle'
  | 'running'
  | 'awaiting_approval'
  | 'paused'
  | 'offline'
  | 'error'
  | 'unknown';

export type MoonTaskReadModel = {
  task_id: string;
  queue: string;
  tenant: string | null;
  agent: string;
  status: MoonTaskStatus;
  waiting: number | null;
  active: number | null;
  specialization: string;
  correlation_id: null;
  note: string;
};

export function mapTeamMetricsToMoonTasks(teams: TeamMetrics[]): MoonTaskReadModel[] {
  return teams.map((team) => {
    const waiting = team.waiting ?? null;
    const active = team.active ?? null;
    let status: MoonTaskStatus = 'unknown';
    if (team.status === 'idle') status = 'idle';
    else if (team.status === 'busy' || (active !== null && active > 0)) status = 'running';
    else if (team.status === 'active') status = waiting && waiting > 0 ? 'running' : 'idle';
    else status = 'unknown';

    return {
      task_id: `team:${team.name}`,
      queue: 'openclaw',
      tenant: null,
      agent: team.name,
      status,
      waiting,
      active,
      specialization: team.specialization,
      correlation_id: null,
      note: 'Derivado de GET /api/metrics/teams — sin envelope de tarea individual.',
    };
  });
}

export type MoonQueueSummary = {
  queue: string;
  waiting: number;
  active: number;
  teams: number;
  source: string;
  confidence: 'REAL' | 'ESTIMADO';
};

export function summarizeQueueFromTeams(teams: TeamMetrics[]): MoonQueueSummary {
  const waiting = teams.reduce((acc, t) => acc + (t.waiting ?? 0), 0);
  const active = teams.reduce((acc, t) => acc + (t.active ?? 0), 0);
  return {
    queue: 'openclaw',
    waiting,
    active,
    teams: teams.length,
    source: 'GET /api/metrics/teams',
    confidence: 'REAL',
  };
}
