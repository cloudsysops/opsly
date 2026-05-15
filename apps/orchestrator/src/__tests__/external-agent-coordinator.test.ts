import { describe, expect, it, beforeEach } from 'vitest';
import { join } from 'node:path';

import {
  clearExternalAgentCoordinatorCache,
  resolveOpslyJobTypeForPrompt,
} from '../lib/external-agent-coordinator.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..');

describe('external-agent-coordinator', () => {
  beforeEach(() => {
    clearExternalAgentCoordinatorCache();
    process.env.OPSLY_ROOT = REPO_ROOT;
  });

  it('routes planner role to claude via registry', async () => {
    const { opslyJobType, worker } = await resolveOpslyJobTypeForPrompt({
      agentRole: 'planner',
    });
    expect(opslyJobType).toBe('local_claude');
    expect(worker.workerId).toBe('claude-code');
  });

  it('pins explicit codex job type', async () => {
    const { worker } = await resolveOpslyJobTypeForPrompt({
      explicitAgent: 'local_codex',
    });
    expect(worker.workerId).toBe('codex-cli');
  });
});
