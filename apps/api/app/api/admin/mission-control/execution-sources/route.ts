import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { NextResponse } from 'next/server';
import { requireAdminAccess } from '../../../../../lib/auth';
import { detectCanonicalDispatchAdmission } from '../../../../../lib/mission-control-execution-source-admission';

type RuntimeState = 'LIVE' | 'UNHEALTHY' | 'UNREACHABLE' | 'UNKNOWN';

type RuntimeFleetRow = {
  worker_id: string;
  opsly_job_type: string;
  registry_enabled: boolean;
  runtime_state: RuntimeState;
  dispatch_eligible: boolean;
  dispatch_blocker: string | null;
  health_source: string | null;
  observed_at: string;
};

function resolveRepoRoot(): string {
  const cwd = process.cwd();
  const repoRoot = process.env.OPSLY_REPO_ROOT?.trim();
  const candidates = [
    ...(repoRoot ? [repoRoot] : []),
    cwd,
    join(cwd, '..'),
    join(cwd, '..', '..'),
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'config', 'external-agent-registry.json'))) {
      return candidate;
    }
  }
  return cwd;
}



function orchestratorBaseUrl(): string {
  return (process.env.ORCHESTRATOR_INTERNAL_URL?.trim() || 'http://orchestrator:3011').replace(
    /\/+$/,
    '',
  );
}

async function fetchRuntimeFleet(): Promise<{
  observed: boolean;
  agents: RuntimeFleetRow[];
  error?: string;
}> {
  const token = process.env.PLATFORM_ADMIN_TOKEN?.trim();
  if (!token) {
    return { observed: false, agents: [], error: 'PLATFORM_ADMIN_TOKEN is not configured' };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(`${orchestratorBaseUrl()}/api/local/external-agents`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
      cache: 'no-store',
    });

    if (!response.ok) {
      return {
        observed: false,
        agents: [],
        error: `orchestrator fleet endpoint returned ${response.status}`,
      };
    }

    const payload = (await response.json()) as { agents?: RuntimeFleetRow[] };
    return {
      observed: true,
      agents: Array.isArray(payload.agents) ? payload.agents : [],
    };
  } catch (error) {
    return {
      observed: false,
      agents: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(request: Request): Promise<Response> {
  const authError = await requireAdminAccess(request);
  if (authError) return authError;

  const root = resolveRepoRoot();
  const registryPath = join(root, 'config', 'external-agent-registry.json');
  const queueSubmitterPath = join(root, 'scripts', 'ops', 'github-agent-queue-submit.mjs');
  const handoffPath = join(root, 'scripts', 'ops', 'interactive-agent-handoff.mjs');

  try {
    const [registryRaw, queueSubmitter, runtimeFleet] = await Promise.all([
      readFile(registryPath, 'utf8'),
      readFile(queueSubmitterPath, 'utf8').catch(() => ''),
      fetchRuntimeFleet(),
    ]);
    const registry = JSON.parse(registryRaw) as {
      workers?: Record<string, { enabled?: boolean; opsly_job_type?: string }>;
    };

    const liveByWorker = new Map(runtimeFleet.agents.map((agent) => [agent.worker_id, agent]));

    const registeredWorkers = Object.entries(registry.workers ?? {})
      .map(([id, entry]) => {
        const live = liveByWorker.get(id);
        return {
          id,
          enabled: entry.enabled === true,
          opsly_job_type:
            typeof entry.opsly_job_type === 'string' ? entry.opsly_job_type : null,
          runtime_state: live?.runtime_state ?? ('UNKNOWN' as const),
          dispatch_eligible: live?.dispatch_eligible ?? false,
          dispatch_blocker:
            live?.dispatch_blocker ??
            (entry.enabled === true ? 'runtime_not_observed' : 'registry_disabled'),
          health_source: live?.health_source ?? null,
          observed_at: live?.observed_at ?? null,
        };
      })
      .sort((a, b) => a.id.localeCompare(b.id));

    const registryDrivenAdmission = detectCanonicalDispatchAdmission(queueSubmitter);

    return NextResponse.json({
      schema_version: 'MissionControlExecutionSourcesV1',
      observed_at: new Date().toISOString(),
      registry_driven_admission: registryDrivenAdmission,
      handoff_available: existsSync(handoffPath),
      runtime_fleet_observed: runtimeFleet.observed,
      runtime_fleet_error: runtimeFleet.error ?? null,
      registered_workers: registeredWorkers,
    });
  } catch (error) {
    console.error('[mission-control/execution-sources] Error:', error);
    return NextResponse.json({
      schema_version: 'MissionControlExecutionSourcesV1',
      observed_at: new Date().toISOString(),
      registry_driven_admission: false,
      handoff_available: false,
      runtime_fleet_observed: false,
      runtime_fleet_error: 'execution source probe unavailable',
      registered_workers: [],
      error: 'execution source probe unavailable',
    });
  }
}
