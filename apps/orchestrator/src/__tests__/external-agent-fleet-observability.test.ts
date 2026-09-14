import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExternalAgentRegistryFile } from '@intcloudsysops/external-agent-registry';
import {
  buildExternalAgentFleetSnapshot,
  resolveExternalAgentHealthUrl,
} from '../http/routes/external-agents.js';

function registry(): ExternalAgentRegistryFile {
  return {
    version: 1,
    updated_at: '2026-09-13',
    principle: 'test',
    default_worker_id: 'hermes-cli',
    routing_notes: {},
    workers: {
      'hermes-cli': {
        kind: 'external-binary',
        adapter: 'agent-binary-http-bridge',
        command: 'hermes',
        opsly_job_type: 'local_hermes',
        bridge_port: 5007,
        default_model: 'opsly:balanced',
        write_access: false,
        risk_ceiling: 'medium',
        capabilities: ['planning'],
        provider: 'hermes',
        runtime: 'cli',
        supported_task_types: ['planning'],
        skills: [],
        local: true,
        open_source: false,
        priority: 30,
        fallback_agents: [],
        enabled: true,
      },
      'openclaw-cli': {
        kind: 'external-binary',
        adapter: 'agent-binary-http-bridge',
        command: 'openclaw',
        opsly_job_type: 'local_openclaw',
        bridge_port: 5012,
        default_model: 'opsly:balanced',
        write_access: true,
        risk_ceiling: 'high',
        capabilities: ['tool-use'],
        provider: 'openclaw',
        runtime: 'cli',
        supported_task_types: ['code'],
        skills: [],
        local: true,
        open_source: true,
        priority: 32,
        fallback_agents: [],
        enabled: false,
      },
    },
  };
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('external agent fleet observability', () => {
  it('separates observed runtime health from dispatch policy', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 })) as typeof fetch;
    const rows = await buildExternalAgentFleetSnapshot(registry(), fetchImpl);

    const hermes = rows.find((row) => row.worker_id === 'hermes-cli');
    const openclaw = rows.find((row) => row.worker_id === 'openclaw-cli');

    expect(hermes).toMatchObject({
      runtime_state: 'LIVE',
      registry_enabled: true,
      dispatch_eligible: true,
      dispatch_blocker: null,
    });

    expect(openclaw).toMatchObject({
      runtime_state: 'LIVE',
      registry_enabled: false,
      dispatch_eligible: false,
      dispatch_blocker: 'registry_disabled',
    });
  });

  it('fails closed when registry metadata would be rejected by canonical queue admission', async () => {
    const broken = registry();
    broken.workers['hermes-cli'] = {
      ...broken.workers['hermes-cli'],
      adapter: 'unsupported-adapter',
    };

    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 })) as typeof fetch;
    const rows = await buildExternalAgentFleetSnapshot(broken, fetchImpl);
    const hermes = rows.find((row) => row.worker_id === 'hermes-cli');

    expect(hermes).toMatchObject({
      runtime_state: 'LIVE',
      registry_enabled: true,
      dispatch_eligible: false,
      dispatch_blocker: 'unsupported_adapter',
    });
  });

  it('reports unreachable without fabricating a live runtime', async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error('connection refused');
    }) as typeof fetch;

    const rows = await buildExternalAgentFleetSnapshot(registry(), fetchImpl);
    const hermes = rows.find((row) => row.worker_id === 'hermes-cli');

    expect(hermes?.runtime_state).toBe('UNREACHABLE');
    expect(hermes?.dispatch_eligible).toBe(false);
    expect(hermes?.dispatch_blocker).toBe('runtime_unreachable');
  });

  it('treats a declared but missing endpoint override as UNKNOWN instead of assuming loopback', async () => {
    const configured = registry();
    configured.workers['hermes-cli'] = {
      ...configured.workers['hermes-cli'],
      endpoint_env: 'OPSLY_HERMES_AGENT_URL',
    };

    const fetchImpl = vi.fn(async () => new Response(null, { status: 200 })) as typeof fetch;
    const rows = await buildExternalAgentFleetSnapshot(configured, fetchImpl);
    const hermes = rows.find((row) => row.worker_id === 'hermes-cli');

    expect(resolveExternalAgentHealthUrl(configured.workers['hermes-cli'])).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
    expect(hermes).toMatchObject({
      runtime_state: 'UNKNOWN',
      dispatch_eligible: false,
      dispatch_blocker: 'runtime_unknown',
      health_source: null,
    });
  });

  it('uses environment endpoint override when configured', () => {
    vi.stubEnv('OPSLY_HERMES_AGENT_URL', 'http://hermes.internal:5007/');
    const entry = {
      ...registry().workers['hermes-cli'],
      endpoint_env: 'OPSLY_HERMES_AGENT_URL',
    };

    expect(resolveExternalAgentHealthUrl(entry)).toBe('http://hermes.internal:5007/health');
  });
});
