import { describe, expect, it, beforeEach } from 'vitest';
import { join } from 'node:path';

import {
  clearExternalAgentRegistryCache,
  loadExternalAgentRegistry,
  routeAgentTask,
  routeExternalWorker,
} from '../index.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..');

describe('external-agent-registry', () => {
  beforeEach(() => {
    clearExternalAgentRegistryCache();
  });

  it('loads canonical config from repo', async () => {
    const registry = await loadExternalAgentRegistry(REPO_ROOT);
    expect(registry.version).toBe(1);
    expect(registry.workers['claude-code']?.command).toBe('claude');
    expect(registry.workers['opencode']?.opsly_job_type).toBe('local_opencode');
  });

  it('routes architecture to claude-code', async () => {
    const registry = await loadExternalAgentRegistry(REPO_ROOT);
    const resolved = routeExternalWorker(registry, { intent: 'architecture' });
    expect(resolved.workerId).toBe('claude-code');
    expect(resolved.opslyJobType).toBe('local_claude');
  });

  it('routes implementation to opencode', async () => {
    const registry = await loadExternalAgentRegistry(REPO_ROOT);
    const resolved = routeExternalWorker(registry, { agentRole: 'executor' });
    expect(resolved.workerId).toBe('opencode');
  });

  it('respects explicit opsly job type', async () => {
    const registry = await loadExternalAgentRegistry(REPO_ROOT);
    const resolved = routeExternalWorker(registry, {
      explicitOpslyJobType: 'local_codex',
    });
    expect(resolved.workerId).toBe('codex-cli');
  });

  it('routes a versioned local task without an LLM', async () => {
    const registry = await loadExternalAgentRegistry(REPO_ROOT);
    const result = routeAgentTask(registry, {
      schema_version: 'AgentTaskEnvelopeV1',
      request_id: 'req-1',
      correlation_id: 'corr-1',
      tenant_slug: 'academy-demo',
      task_type: 'code',
      task: 'run a focused type-check',
      selected_agent: 'opencode',
      skills: ['opsly-context'],
      constraints: {
        open_source_only: true,
        local_only: true,
        browser_allowed: false,
        network_allowed: false,
        write_allowed: false,
        file_scope: [],
        max_tokens: 1600,
      },
      execution_mode: 'dry_run',
      source: 'test',
      actor: 'test',
      created_at: new Date().toISOString(),
      timeout_ms: 120000,
      max_attempts: 2,
      budget: { max_tokens: 1600 },
      metadata: {},
      fallback_agents: [],
    });
    expect(result.selected_agent).toBe('opencode');
    expect(result.rationale_codes).toContain('CAPABILITY_MATCH');
  });
});
