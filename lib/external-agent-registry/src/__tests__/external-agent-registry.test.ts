import { describe, expect, it, beforeEach } from 'vitest';
import { join } from 'node:path';

import {
  clearExternalAgentRegistryCache,
  loadExternalAgentRegistry,
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
});
