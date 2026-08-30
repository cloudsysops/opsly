import { describe, expect, it, vi } from 'vitest';

import {
  getMissionControlFoundationReadModel,
  getPlatformAgentRegistry,
  getPlatformTenantRegistry,
  type MissionControlReadModel,
} from '../platform-foundation';
import { getCache, setCache } from '../redis-cache';
import { CACHE_TTL } from '../constants';

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(() => Promise.resolve(null)),
  setCache: vi.fn(() => Promise.resolve(true)),
}));

vi.mock('../admin-mission-control-openclaw', () => ({
  getOpenClawMissionControlSnapshot: vi.fn(() =>
    Promise.resolve({
      intents: [],
      intents_in_progress: [],
      recent_policy_violations: [],
      agent_metrics: {},
      generated_at: '2026-08-26T12:00:00.000Z',
    })
  ),
}));

describe('platform foundation registry loaders', () => {
  it('loads the tenant registry from config', async () => {
    const registry = await getPlatformTenantRegistry();
    expect(registry.stages.length).toBeGreaterThan(0);
    expect(registry.items.length).toBeGreaterThan(0);
    expect(
      registry.by_stage.incubated_tenant + registry.by_stage.mvp_validation
    ).toBeGreaterThanOrEqual(0);
  });

  it('loads the agent registry from config', async () => {
    const registry = await getPlatformAgentRegistry();
    expect(registry.items.length).toBeGreaterThan(0);
    expect(registry.summary.total).toBe(registry.items.length);
  });
});

describe('getMissionControlFoundationReadModel caching', () => {
  it('returns cached snapshot on cache hit', async () => {
    const mockSnapshot = {
      generated_at: '2026-08-26T12:00:00.000Z',
      vps: {
        host: 'vps-test',
        status: 'healthy',
        api_connectivity: 'up',
        orchestrator_connectivity: 'up',
        llm_gateway_connectivity: 'up',
        redis_connectivity: 'up',
      },
      tenants: {
        total: 1,
        by_stage: {
          incubated_tenant: 1,
          mvp_validation: 0,
          operational_stabilization: 0,
          dedicated_vps: 0,
          independent_platform: 0,
          connected_client_platform: 0,
        },
        extraction_ready: 1,
        items: [],
      },
      backups: { status: 'ready', policy: 'test', ready_tenants: 1, last_success_at: null },
      ssl: { status: 'ready', wildcard_domain: '*.test', ready_tenants: 1 },
      workflows: { status: 'ready', total: 1, bootstrap_ready: 1 },
      uptime: { status: 'ready', services: [] },
      ai_agents: { total: 1, healthy: 1, degraded: 0, blocked: 0, items: [] },
      pending_approvals: { count: 0, queues: [] },
      extraction_readiness: { ready: 1, blocked: 0, items: [] },
      openclaw: {
        intents: [],
        intents_in_progress: [],
        recent_policy_violations: [],
        agent_metrics: {},
        generated_at: '2026-08-26T12:00:00.000Z',
      },
    } as MissionControlReadModel;

    vi.mocked(getCache).mockResolvedValueOnce(mockSnapshot);

    const result = await getMissionControlFoundationReadModel();
    expect(result).toBe(mockSnapshot);
    expect(getCache).toHaveBeenCalledWith('mission_control:foundation_read_model');
  });

  it('builds fresh snapshot and sets cache on cache miss', async () => {
    vi.mocked(getCache).mockResolvedValueOnce(null);

    const result = await getMissionControlFoundationReadModel();
    expect(result).toBeDefined();
    expect(result.vps).toBeDefined();
    expect(setCache).toHaveBeenCalledWith(
      'mission_control:foundation_read_model',
      result,
      CACHE_TTL.SHORT
    );
  });
});
