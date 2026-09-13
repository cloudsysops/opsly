import type { ExternalAgentRegistryFile, ExternalWorkerEntry } from '@intcloudsysops/external-agent-registry';
import { getExternalAgentRegistry } from '../../lib/external-agent-coordinator.js';
import type { RouteContext } from '../router.js';
import { errorResponse, jsonResponse } from '../router.js';
import { verifyPlatformAdminToken } from '../utils.js';

export type ExternalAgentRuntimeState = 'LIVE' | 'UNHEALTHY' | 'UNREACHABLE' | 'UNKNOWN';

export type ExternalAgentFleetRow = {
  worker_id: string;
  opsly_job_type: string;
  command: string;
  runtime: string;
  capabilities: string[];
  registry_enabled: boolean;
  runtime_state: ExternalAgentRuntimeState;
  dispatch_eligible: boolean;
  dispatch_blocker: string | null;
  health_source: string | null;
  observed_at: string;
};

type FetchLike = typeof fetch;

function joinHealthUrl(base: string, healthEndpoint?: string): string {
  const normalizedBase = base.replace(/\/$/, '');
  if (!healthEndpoint) return `${normalizedBase}/health`;
  if (/^https?:\/\//i.test(healthEndpoint)) return healthEndpoint;
  return `${normalizedBase}/${healthEndpoint.replace(/^\//, '')}`;
}

export function resolveExternalAgentHealthUrl(entry: ExternalWorkerEntry): string | null {
  const envUrl =
    entry.endpoint_env && typeof process.env[entry.endpoint_env] === 'string'
      ? process.env[entry.endpoint_env]?.trim()
      : '';

  const base =
    envUrl ||
    (entry.bridge_port && entry.local
      ? `http://127.0.0.1:${entry.bridge_port}`
      : '');

  if (!base) return null;
  return joinHealthUrl(base, entry.health_endpoint);
}

async function requestHealth(url: string, fetchImpl: FetchLike): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const head = await fetchImpl(url, { method: 'HEAD', signal: controller.signal });
    if (head.status !== 405 && head.status !== 501) return head;
    return fetchImpl(url, { method: 'GET', signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function probeExternalAgentRuntime(
  entry: ExternalWorkerEntry,
  fetchImpl: FetchLike = fetch
): Promise<{ state: ExternalAgentRuntimeState; source: string | null }> {
  const healthUrl = resolveExternalAgentHealthUrl(entry);
  if (!healthUrl) return { state: 'UNKNOWN', source: null };

  try {
    const response = await requestHealth(healthUrl, fetchImpl);
    return {
      state: response.ok ? 'LIVE' : 'UNHEALTHY',
      source: entry.endpoint_env || (entry.bridge_port ? `bridge:${entry.bridge_port}` : null),
    };
  } catch {
    return {
      state: 'UNREACHABLE',
      source: entry.endpoint_env || (entry.bridge_port ? `bridge:${entry.bridge_port}` : null),
    };
  }
}

export async function buildExternalAgentFleetSnapshot(
  registry: ExternalAgentRegistryFile,
  fetchImpl: FetchLike = fetch
): Promise<ExternalAgentFleetRow[]> {
  const observedAt = new Date().toISOString();

  return Promise.all(
    Object.entries(registry.workers)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(async ([workerId, entry]) => {
        const runtime = await probeExternalAgentRuntime(entry, fetchImpl);
        const dispatchEligible = entry.enabled === true && runtime.state === 'LIVE';

        let blocker: string | null = null;
        if (entry.enabled !== true) blocker = 'registry_disabled';
        else if (runtime.state !== 'LIVE') blocker = `runtime_${runtime.state.toLowerCase()}`;

        return {
          worker_id: workerId,
          opsly_job_type: entry.opsly_job_type,
          command: entry.command,
          runtime: entry.runtime,
          capabilities: entry.capabilities,
          registry_enabled: entry.enabled === true,
          runtime_state: runtime.state,
          dispatch_eligible: dispatchEligible,
          dispatch_blocker: blocker,
          health_source: runtime.source,
          observed_at: observedAt,
        };
      })
  );
}

export async function handleExternalAgentsRegistry(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }

  try {
    const registry = await getExternalAgentRegistry();
    const agents = await buildExternalAgentFleetSnapshot(registry);

    jsonResponse(ctx.res, 200, {
      ok: true,
      schema_version: 'ExternalAgentFleetSnapshotV1',
      generated_at: new Date().toISOString(),
      agents,
      summary: {
        registered: agents.length,
        runtime_live: agents.filter((agent) => agent.runtime_state === 'LIVE').length,
        dispatch_eligible: agents.filter((agent) => agent.dispatch_eligible).length,
        policy_locked: agents.filter(
          (agent) => agent.runtime_state === 'LIVE' && !agent.registry_enabled
        ).length,
      },
    });
  } catch (error) {
    jsonResponse(ctx.res, 503, {
      ok: false,
      schema_version: 'ExternalAgentFleetSnapshotV1',
      generated_at: new Date().toISOString(),
      agents: [],
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
