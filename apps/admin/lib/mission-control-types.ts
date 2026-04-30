/**
 * Tipos compartidos Mission Control (admin) — alineados a
 * GET /api/admin/mission-control/{teams,orchestrator,openclaw}.
 */

export type AgentTeam = {
  name: string;
  status: 'active' | 'idle' | 'error';
  lastTask: string | null;
  completedTasks: number;
  failedTasks: number;
  avgDurationMs: number;
};

export type AgentTeamsResponse = {
  teams: AgentTeam[];
  generated_at: string;
};

export type OrchestratorStatus = {
  mode: string;
  role: string;
  workers: Record<string, { concurrency: number; active: number }>;
  queue: {
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  };
};

export type OpenClawIntentRuntime = {
  request_id: string;
  tenant_slug: string | null;
  intent: string | null;
  status: string;
  current_stage: string | null;
  started_at: string | null;
  updated_at: string | null;
  last_error: string | null;
};

export type OpenClawPolicyViolation = {
  request_id: string | null;
  tenant_slug: string | null;
  reason: string;
  intent: string;
  agent_role: string | null;
  timestamp: string;
};

export type OpenClawSnapshot = {
  intents: OpenClawIntentRuntime[];
  intents_in_progress: OpenClawIntentRuntime[];
  recent_policy_violations: OpenClawPolicyViolation[];
  agent_metrics: Record<string, number>;
  generated_at: string;
};

export type AgentLifecycleStatus =
  | 'idle'
  | 'thinking'
  | 'running'
  | 'blocked'
  | 'failed'
  | 'sleeping'
  | 'dead'
  | 'reviving';

/** Mapea estado API de equipo / intent a ciclo de vida visual Office */
export function mapTeamToLifecycle(team: AgentTeam): AgentLifecycleStatus {
  if (team.status === 'error') {
    return 'failed';
  }
  if (team.status === 'active') {
    return 'running';
  }
  return 'idle';
}

export function mapIntentToLifecycle(intent: OpenClawIntentRuntime): AgentLifecycleStatus {
  const s = intent.status.toLowerCase();
  if (s.includes('fail') || intent.last_error) {
    return 'failed';
  }
  if (s.includes('block')) {
    return 'blocked';
  }
  if (s.includes('run') || s.includes('progress')) {
    return 'running';
  }
  if (s.includes('think')) {
    return 'thinking';
  }
  return 'idle';
}
