import { beforeEach, describe, expect, it } from 'vitest';
import { join } from 'node:path';
import {
  clearExternalAgentRegistryCache,
  loadExternalAgentRegistry,
  routeModelV1,
} from '../index.js';
import type { AgentTaskEnvelopeV1 } from '@intcloudsysops/types';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..');

function task(overrides: Partial<AgentTaskEnvelopeV1> = {}): AgentTaskEnvelopeV1 {
  return {
    schema_version: 'AgentTaskEnvelopeV1',
    request_id: 'route-1',
    correlation_id: 'corr-route-1',
    tenant_slug: 'opsly-internal',
    task_type: 'code',
    task: 'implement a focused change',
    selected_agent: 'local_opencode',
    requested_agent: null,
    skills: ['opsly-context'],
    constraints: {
      open_source_only: false,
      local_only: true,
      browser_allowed: false,
      network_allowed: false,
      write_allowed: true,
      file_scope: [],
      max_tokens: 1600,
    },
    execution_mode: 'dry_run',
    source: 'test',
    actor: 'test',
    created_at: '2026-09-13T15:00:00.000Z',
    timeout_ms: 120000,
    max_attempts: 2,
    budget: { max_tokens: 1600, max_cost_usd: 0 },
    metadata: {},
    fallback_agents: [],
    ...overrides,
  };
}

describe('ModelRouteDecisionV1', () => {
  beforeEach(() => clearExternalAgentRegistryCache());

  it('routes easy local coding to zero-cost OpenCode', async () => {
    const registry = await loadExternalAgentRegistry(REPO_ROOT);
    const result = routeModelV1(registry, {
      task: task(),
      availability: [
        {
          worker_id: 'opencode',
          node_id: 'mac-1',
          node_type: 'mac',
          available: true,
          locality: 'local',
          cost_class: 'zero',
          latency_class: 'fast',
          models: ['qwen3:8b'],
        },
        {
          worker_id: 'codex-cli',
          node_id: 'mac-1',
          node_type: 'mac',
          available: true,
          locality: 'local',
          cost_class: 'paid',
          estimated_cost_usd: 0.2,
        },
      ],
    });
    expect(result.status).toBe('selected');
    expect(result.selected_worker_id).toBe('opencode');
    expect(result.selected_cost_class).toBe('zero');
  });

  it('keeps Gamer-only capability on Gamer', async () => {
    const registry = await loadExternalAgentRegistry(REPO_ROOT);
    const result = routeModelV1(registry, {
      task: task(),
      required_capabilities: ['gpu'],
      required_node_type: 'gamer',
      availability: [
        {
          worker_id: 'opencode',
          node_id: 'mac-1',
          node_type: 'mac',
          available: true,
          locality: 'local',
          cost_class: 'zero',
          additional_capabilities: ['code-edit'],
        },
        {
          worker_id: 'opencode',
          node_id: 'gamer-1',
          node_type: 'gamer',
          available: true,
          locality: 'local',
          cost_class: 'zero',
          models: ['qwen3:14b'],
          additional_capabilities: ['gpu'],
        },
      ],
    });
    expect(result.status).toBe('selected');
    expect(result.selected_node_id).toBe('gamer-1');
    expect(result.reason_codes).toContain('NODE_PLACEMENT_MATCH');
  });

  it('blocks when the local runtime is unavailable', async () => {
    const registry = await loadExternalAgentRegistry(REPO_ROOT);
    const result = routeModelV1(registry, {
      task: task(),
      availability: [
        {
          worker_id: 'opencode',
          node_id: 'gamer-1',
          node_type: 'gamer',
          available: false,
          locality: 'local',
          cost_class: 'zero',
        },
      ],
    });
    expect(result.status).toBe('blocked');
    expect(result.rejected_candidates[0]?.reason).toBe('RUNTIME_UNAVAILABLE');
  });

  it('never silently falls back to a paid runtime', async () => {
    const registry = await loadExternalAgentRegistry(REPO_ROOT);
    const paidRegistry = {
      ...registry,
      workers: {
        ...registry.workers,
        'paid-worker': {
          ...registry.workers['codex-cli']!,
          opsly_job_type: 'paid_worker',
          supported_task_types: ['code'],
          enabled: true,
        },
      },
    };
    const result = routeModelV1(paidRegistry, {
      task: task({ budget: { max_tokens: 1600, max_cost_usd: 1 } }),
      escalation_policy: 'allow_paid_with_approval',
      availability: [
        {
          worker_id: 'paid-worker',
          node_id: 'cloud-1',
          node_type: 'vps',
          available: true,
          locality: 'external',
          cost_class: 'paid',
          estimated_cost_usd: 0.25,
        },
      ],
    });
    expect(result.status).toBe('approval_required');
    expect(result.selected_worker_id).toBeNull();
    expect(result.escalation_candidate?.worker_id).toBe('paid-worker');
  });

  it('rejects tenant-sensitive work on external locality', async () => {
    const registry = await loadExternalAgentRegistry(REPO_ROOT);
    const result = routeModelV1(registry, {
      task: task(),
      tenant_sensitive: true,
      availability: [
        {
          worker_id: 'opencode',
          node_id: 'external-1',
          node_type: 'vps',
          available: true,
          locality: 'external',
          cost_class: 'zero',
        },
      ],
    });
    expect(result.status).toBe('blocked');
    expect(result.rejected_candidates[0]?.reason).toBe('TENANT_LOCALITY_MISMATCH');
  });

  it('uses deterministic worker/node tie-breaking', async () => {
    const registry = await loadExternalAgentRegistry(REPO_ROOT);
    const result = routeModelV1(registry, {
      task: task(),
      availability: [
        {
          worker_id: 'opencode',
          node_id: 'gamer-b',
          node_type: 'gamer',
          available: true,
          locality: 'local',
          cost_class: 'zero',
          latency_class: 'fast',
        },
        {
          worker_id: 'opencode',
          node_id: 'gamer-a',
          node_type: 'gamer',
          available: true,
          locality: 'local',
          cost_class: 'zero',
          latency_class: 'fast',
        },
      ],
    });
    expect(result.selected_node_id).toBe('gamer-a');
  });
});
