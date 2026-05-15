/**
 * Runtime governor — enforces concurrency limits for local agents, tmux, sandboxes.
 * @see config/runtime-governor.json
 */
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

import { listSessions } from '@intcloudsysops/session-manager';

import {
  countByState,
  hasActiveImplementation,
  listLifecycleEntries,
  setJobLifecycle,
  type AgentLifecycleState,
} from './runtime-governor-lifecycle.js';
import { resourcePressureWarnings, sampleHostResources } from './resource-monitor.js';

export interface RuntimeGovernorConfig {
  version: number;
  principle: string;
  max_active_implementation_workers: number;
  max_active_planning_workers: number;
  max_parallel_jobs: number;
  max_background_tmux_sessions: number;
  max_docker_sandboxes: number;
  agent_idle_timeout_minutes: number;
  require_approval_for_extra_agents: boolean;
  prefer_sequential_execution: boolean;
  cheap_model_aliases: string[];
  premium_model_aliases: string[];
  implementation_roles: string[];
  planning_roles: string[];
  review_roles: string[];
  resource_thresholds?: { memory_percent?: number; load_per_cpu?: number };
  tier_limits?: Record<
    string,
    Partial<{
      max_active_implementation_workers: number;
      max_active_planning_workers: number;
      max_parallel_jobs: number;
      max_background_tmux_sessions: number;
      max_docker_sandboxes: number;
    }>
  >;
}

export interface GovernorEnqueueContext {
  job_type: string;
  agent_role?: string;
  autonomy_approved?: boolean;
  tenant_plan?: string;
  metadata?: Record<string, unknown>;
}

export interface GovernorDecision {
  allowed: boolean;
  reason: string;
  warnings: string[];
  metrics: GovernorMetrics;
}

export interface GovernorMetrics {
  active_local_jobs: number;
  active_implementation: number;
  active_planning: number;
  active_sandboxes: number;
  tmux_sessions: number;
  lifecycle_running: number;
  lifecycle_queued: number;
}

export interface GovernorStatusSnapshot {
  config: RuntimeGovernorConfig;
  effective_limits: {
    max_parallel_jobs: number;
    max_active_implementation_workers: number;
    max_active_planning_workers: number;
    max_background_tmux_sessions: number;
    max_docker_sandboxes: number;
  };
  metrics: GovernorMetrics;
  lifecycle: ReturnType<typeof listLifecycleEntries>;
  host_resources: ReturnType<typeof sampleHostResources>;
  warnings: string[];
  mission_control_alerts: string[];
  sampled_at: string;
}

let configCache: RuntimeGovernorConfig | null = null;

const activeLocalJobs = new Map<string, { role: string; startedAt: number }>();
let activeSandboxJobs = 0;

function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, 'config', 'runtime-governor.json'))) {
      return dir;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
}

function opslyRoot(): string {
  return process.env.OPSLY_ROOT?.trim() || findRepoRoot(process.cwd());
}

export async function loadRuntimeGovernorConfig(): Promise<RuntimeGovernorConfig> {
  if (configCache) {
    return configCache;
  }
  const path = join(opslyRoot(), 'config', 'runtime-governor.json');
  const raw = await readFile(path, 'utf8');
  configCache = JSON.parse(raw) as RuntimeGovernorConfig;
  return configCache;
}

export function clearRuntimeGovernorCache(): void {
  configCache = null;
}

function normalizeRole(role: string | undefined): string {
  return (role ?? 'executor').trim().toLowerCase();
}

function isImplementationRole(cfg: RuntimeGovernorConfig, role: string): boolean {
  return cfg.implementation_roles.some((r) => role.includes(r));
}

function isPlanningRole(cfg: RuntimeGovernorConfig, role: string): boolean {
  return cfg.planning_roles.some((r) => role.includes(r));
}

function isReviewRole(cfg: RuntimeGovernorConfig, role: string): boolean {
  return cfg.review_roles.some((r) => role.includes(r));
}

function resolveTierKey(plan?: string): string {
  const p = (plan ?? 'free').trim().toLowerCase();
  if (p === 'startup') return 'startup';
  if (p === 'business') return 'business';
  if (p === 'enterprise') return 'enterprise';
  if (p === 'pro') return 'pro';
  return 'free';
}

export function effectiveLimits(
  cfg: RuntimeGovernorConfig,
  tenantPlan?: string,
): GovernorStatusSnapshot['effective_limits'] {
  const tier = cfg.tier_limits?.[resolveTierKey(tenantPlan)] ?? {};
  return {
    max_parallel_jobs: tier.max_parallel_jobs ?? cfg.max_parallel_jobs,
    max_active_implementation_workers:
      tier.max_active_implementation_workers ?? cfg.max_active_implementation_workers,
    max_active_planning_workers:
      tier.max_active_planning_workers ?? cfg.max_active_planning_workers,
    max_background_tmux_sessions:
      tier.max_background_tmux_sessions ?? cfg.max_background_tmux_sessions,
    max_docker_sandboxes: tier.max_docker_sandboxes ?? cfg.max_docker_sandboxes,
  };
}

async function collectMetrics(cfg: RuntimeGovernorConfig): Promise<GovernorMetrics> {
  let implementation = 0;
  let planning = 0;
  for (const entry of activeLocalJobs.values()) {
    if (isImplementationRole(cfg, entry.role)) implementation += 1;
    if (isPlanningRole(cfg, entry.role)) planning += 1;
  }

  let tmuxCount = 0;
  try {
    const sessions = await listSessions();
    tmuxCount = sessions.filter((s) => s.status === 'running' || s.status === 'created').length;
  } catch {
    /* ignore */
  }

  return {
    active_local_jobs: activeLocalJobs.size,
    active_implementation: implementation,
    active_planning: planning,
    active_sandboxes: activeSandboxJobs,
    tmux_sessions: tmuxCount,
    lifecycle_running: countByState('RUNNING'),
    lifecycle_queued: countByState('QUEUED'),
  };
}

export function registerActiveLocalJob(
  jobId: string,
  agentRole: string,
  tenantSlug?: string,
): void {
  const role = normalizeRole(agentRole);
  activeLocalJobs.set(jobId, { role, startedAt: Date.now() });
  setJobLifecycle(jobId, 'QUEUED', role, tenantSlug);
}

export function markJobRunning(jobId: string): void {
  const entry = activeLocalJobs.get(jobId);
  if (entry) {
    setJobLifecycle(jobId, 'RUNNING', entry.role);
  }
}

export function releaseActiveLocalJob(jobId: string, finalState: AgentLifecycleState = 'COMPLETED'): void {
  const entry = activeLocalJobs.get(jobId);
  if (entry) {
    setJobLifecycle(jobId, finalState, entry.role);
  }
  activeLocalJobs.delete(jobId);
}

export function registerSandboxJob(): void {
  activeSandboxJobs += 1;
}

export function releaseSandboxJob(): void {
  activeSandboxJobs = Math.max(0, activeSandboxJobs - 1);
}

export function getActiveLocalJobCount(): number {
  return activeLocalJobs.size;
}

export async function evaluateEnqueue(ctx: GovernorEnqueueContext): Promise<GovernorDecision> {
  const cfg = await loadRuntimeGovernorConfig();
  const limits = effectiveLimits(cfg, ctx.tenant_plan);
  const role = normalizeRole(ctx.agent_role);
  const warnings: string[] = [];
  const metrics = await collectMetrics(cfg);

  const host = sampleHostResources();
  warnings.push(...resourcePressureWarnings(host, cfg.resource_thresholds));

  const isSandbox =
    ctx.job_type === 'sandbox_execution' || ctx.job_type === 'jcode_execution';
  const isLocal =
    ctx.job_type.startsWith('local_') || ctx.job_type === 'runtime_session';

  if (!isLocal && !isSandbox) {
    return { allowed: true, reason: 'non-governed job exempt', warnings, metrics };
  }

  if (isSandbox && metrics.active_sandboxes >= limits.max_docker_sandboxes) {
    if (!ctx.autonomy_approved) {
      return {
        allowed: false,
        reason: `MAX_DOCKER_SANDBOXES=${limits.max_docker_sandboxes} reached`,
        warnings,
        metrics,
      };
    }
    warnings.push('Sandbox limit exceeded with approval');
  }

  if (isReviewRole(cfg, role) && hasActiveImplementation(cfg.implementation_roles, cfg.implementation_roles)) {
    if (!ctx.autonomy_approved) {
      return {
        allowed: false,
        reason: 'Review agents run after implementation completes',
        warnings,
        metrics,
      };
    }
    warnings.push('Review while implementation active (approved)');
  }

  if (isLocal) {
    if (metrics.active_local_jobs >= limits.max_parallel_jobs) {
      if (!ctx.autonomy_approved && cfg.require_approval_for_extra_agents) {
        return {
          allowed: false,
          reason: `MAX_PARALLEL_JOBS=${limits.max_parallel_jobs} reached; human approval required`,
          warnings,
          metrics,
        };
      }
      warnings.push('Parallel jobs at limit');
    }

    if (isImplementationRole(cfg, role) && metrics.active_implementation >= limits.max_active_implementation_workers) {
      if (!ctx.autonomy_approved) {
        return {
          allowed: false,
          reason: `MAX_ACTIVE_IMPLEMENTATION=${limits.max_active_implementation_workers} reached`,
          warnings,
          metrics,
        };
      }
      warnings.push('Implementation limit exceeded with approval');
    }

    if (isPlanningRole(cfg, role) && metrics.active_planning >= limits.max_active_planning_workers) {
      if (!ctx.autonomy_approved) {
        return {
          allowed: false,
          reason: `MAX_ACTIVE_PLANNING=${limits.max_active_planning_workers} reached`,
          warnings,
          metrics,
        };
      }
      warnings.push('Planning limit exceeded with approval');
    }

    if (ctx.job_type === 'runtime_session' && metrics.tmux_sessions >= limits.max_background_tmux_sessions) {
      if (!ctx.autonomy_approved) {
        return {
          allowed: false,
          reason: `MAX_BACKGROUND_TMUX_SESSIONS=${limits.max_background_tmux_sessions} reached`,
          warnings,
          metrics,
        };
      }
      warnings.push('Tmux session limit exceeded with approval');
    }
  }

  return { allowed: true, reason: 'within governor limits', warnings, metrics };
}

export async function getGovernorStatusSnapshot(tenantPlan?: string): Promise<GovernorStatusSnapshot> {
  const cfg = await loadRuntimeGovernorConfig();
  const limits = effectiveLimits(cfg, tenantPlan);
  const metrics = await collectMetrics(cfg);
  const host = sampleHostResources();
  const warnings = resourcePressureWarnings(host, cfg.resource_thresholds);

  const mission_control_alerts: string[] = [...warnings];

  if (metrics.active_local_jobs >= limits.max_parallel_jobs) {
    mission_control_alerts.push(
      `At parallel job limit (${metrics.active_local_jobs}/${limits.max_parallel_jobs})`,
    );
  }
  if (metrics.tmux_sessions >= limits.max_background_tmux_sessions) {
    mission_control_alerts.push(
      `Tmux sessions at cap (${metrics.tmux_sessions}/${limits.max_background_tmux_sessions})`,
    );
  }
  if (metrics.active_sandboxes >= limits.max_docker_sandboxes) {
    mission_control_alerts.push(
      `Docker sandboxes at cap (${metrics.active_sandboxes}/${limits.max_docker_sandboxes})`,
    );
  }
  if (cfg.prefer_sequential_execution && metrics.active_implementation > 1) {
    mission_control_alerts.push('Multiple implementation workers active — prefer sequential');
  }

  return {
    config: cfg,
    effective_limits: limits,
    metrics,
    lifecycle: listLifecycleEntries(),
    host_resources: host,
    warnings,
    mission_control_alerts,
    sampled_at: new Date().toISOString(),
  };
}
