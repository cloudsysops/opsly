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

export type PoppingSubagentRiskLevel = 'low' | 'medium' | 'high';

export type PoppingSubagentRole = {
  id: string;
  role: string;
  skill: string;
  skillChain: string[];
  worker: string;
  jobType: string;
  maxDurationMinutes: number;
  riskLevel: PoppingSubagentRiskLevel;
  requiresApproval: boolean;
  checkpointRequired: boolean;
  enabledByDefault: boolean;
  sequenceOrder: number;
  rationale: string;
};

export type PoppingSubagentLimits = {
  maxPoppingSubagents: number;
  maxActivePoppingSubagents: number;
  defaultTimeoutMinutes: number;
};

export type PoppingSubagentPlanStage = PoppingSubagentRole & {
  prompt: string;
  expectedOutput: string[];
  order: number;
  workerHealthy: boolean | null;
  workerUrl: string | null;
};

export type PoppingSubagentAnalysis = {
  summary: string;
  risk: 'SAFE' | 'MODERATE' | 'HIGH';
  filesTouched: string[];
  recommendation: string;
  humanApprovalRequired: boolean;
};

export type PoppingSubagentCatalog = {
  limits: PoppingSubagentLimits;
  roles: PoppingSubagentRole[];
  activeDefaultRoles: PoppingSubagentRole[];
  optionalRoles: PoppingSubagentRole[];
};

export type PoppingSubagentPlan = {
  goal: string;
  strategy: 'sequential';
  createdAt: string;
  limits: PoppingSubagentLimits;
  activeRoles: PoppingSubagentPlanStage[];
  optionalRoles: PoppingSubagentRole[];
  analysis: PoppingSubagentAnalysis;
  missionControlHint: string;
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

export type PlatformTenantLifecycleStageId =
  | 'incubated_tenant'
  | 'mvp_validation'
  | 'operational_stabilization'
  | 'dedicated_vps'
  | 'independent_platform'
  | 'connected_client_platform';

export type HealthSignal = 'up' | 'down' | 'unknown';
export type ReadinessSignal = 'ready' | 'blocked' | 'unknown';
export type OperationalStatus = 'healthy' | 'degraded' | 'blocked' | 'unknown';

export type MissionControlTenant = {
  slug: string;
  name: string;
  plan: string;
  owner_email: string | null;
  schema_name: string | null;
  platform_domain: string | null;
  workflows_count: number;
  status: string;
  lifecycle_stage: PlatformTenantLifecycleStageId;
  lifecycle_label: string;
  operational_status: OperationalStatus;
  extraction_ready: boolean;
  extraction_reason: string | null;
  deployment_readiness: ReadinessSignal;
  backup_ready: boolean;
  ssl_ready: boolean;
  uptime_ready: boolean;
  notes: string | null;
  source: string;
};

export type MissionControlAgent = {
  id: string;
  name: string;
  role: string;
  tenant_scope: 'global' | 'tenant-scoped';
  capabilities: string[];
  permissions: string[];
  enabled: boolean;
  approval_boundary: 'approval-first' | 'workflow-first' | 'read-only';
  health: {
    status: OperationalStatus;
    connectivity: {
      api_connectivity: HealthSignal;
      redis_connectivity: HealthSignal;
      llm_gateway_connectivity: HealthSignal;
      backup_readiness: ReadinessSignal;
      deployment_readiness: ReadinessSignal;
    };
  };
  heartbeat: {
    last_seen_at: string | null;
    interval_seconds: number;
    stale_after_seconds: number;
    source: 'config' | 'runtime' | 'manual';
  };
  model: string | null;
  fallback_model: string | null;
  url: string | null;
  specialization: string[];
};

export type MissionControlFoundationSnapshot = {
  generated_at: string;
  vps: {
    host: string;
    status: OperationalStatus;
    api_connectivity: HealthSignal;
    orchestrator_connectivity: HealthSignal;
    llm_gateway_connectivity: HealthSignal;
    redis_connectivity: HealthSignal;
  };
  tenants: {
    total: number;
    by_stage: Record<PlatformTenantLifecycleStageId, number>;
    extraction_ready: number;
    items: MissionControlTenant[];
  };
  backups: {
    status: ReadinessSignal;
    policy: string;
    ready_tenants: number;
    last_success_at: string | null;
  };
  ssl: {
    status: ReadinessSignal;
    wildcard_domain: string;
    ready_tenants: number;
  };
  workflows: {
    status: ReadinessSignal;
    total: number;
    bootstrap_ready: number;
  };
  uptime: {
    status: ReadinessSignal;
    services: Array<{ name: string; status: HealthSignal; url: string | null }>;
  };
  ai_agents: {
    total: number;
    healthy: number;
    degraded: number;
    blocked: number;
    items: MissionControlAgent[];
  };
  pending_approvals: {
    count: number;
    queues: Array<{ queue: string; waiting: number; active: number }>;
  };
  extraction_readiness: {
    ready: number;
    blocked: number;
    items: Array<{
      slug: string;
      stage: PlatformTenantLifecycleStageId;
      ready: boolean;
      reason: string | null;
    }>;
  };
};
