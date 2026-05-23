import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it, vi } from 'vitest';

describe('local automation audit log', () => {
  afterEach(async () => {
    delete process.env.OPSLY_REPO_ROOT;
    vi.resetModules();
  });

  it('writes audit logs under <repoRoot>/runtime/logs', async () => {
    const repoRoot = await mkdtemp(path.join(os.tmpdir(), 'opsly-audit-log-'));
    process.env.OPSLY_REPO_ROOT = repoRoot;
    vi.resetModules();

    const { appendAutomationAuditEvent } = await import('./audit-log');
    await appendAutomationAuditEvent({
      actor: 'tester',
      action: 'local_runtime.install_plan',
      permission: 'binary.install',
      target: 'brew:jq',
      allowed: true,
      approved: false,
      status: 'planned',
    });

    const logPath = path.join(repoRoot, 'runtime', 'logs', 'local-automation.jsonl');
    const raw = await readFile(logPath, 'utf-8');
    expect(raw).toContain('"action":"local_runtime.install_plan"');

    await rm(repoRoot, { recursive: true, force: true });
  });
});
