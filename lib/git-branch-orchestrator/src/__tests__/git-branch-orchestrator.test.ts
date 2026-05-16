import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { join } from 'node:path';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';

import {
  clearGitBranchPolicyCache,
  createBranchPlan,
  defaultChatOpsMvpTasks,
  assignWorkerToBranch,
  agentBranchName,
  loadGitBranchPolicy,
  listBranchEntries,
  dispatchChatOps,
  buildBranchHygieneReport,
} from '../index.js';

const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..');

describe('git-branch-orchestrator', () => {
  let tempRoot = '';

  beforeEach(async () => {
    clearGitBranchPolicyCache();
    tempRoot = await mkdtemp(join(tmpdir(), 'opsly-git-branch-'));
    process.env.OPSLY_ROOT = REPO_ROOT;
  });

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  it('builds agent branch names from policy', async () => {
    const policy = await loadGitBranchPolicy(REPO_ROOT);
    const name = agentBranchName(policy, 'opencode', 'job-102', 'ai-gateway-retry');
    expect(name).toBe('agent/opencode/job-102/ai-gateway-retry');
  });

  it('creates ChatOps MVP branch plan (plan only)', async () => {
    const plan = await createBranchPlan({
      tenant_slug: 'intcloudsysops',
      initiative: 'chatops-mvp',
      tasks: defaultChatOpsMvpTasks(),
      plan_only: true,
    });

    expect(plan.integration_branch).toBe('integration/chatops-mvp');
    expect(plan.entries.length).toBe(5);
    expect(plan.entries.some((e) => e.branch_name.includes('agent/opencode/'))).toBe(
      true,
    );
    expect(plan.entries.every((e) => e.target_branch === plan.integration_branch)).toBe(
      true,
    );
  });

  it('assigns OpenCode to ai-gateway-retry', async () => {
    process.env.OPSLY_GIT_DRY_RUN = '1';
    const result = await assignWorkerToBranch({
      tenant_slug: 'intcloudsysops',
      initiative: 'chatops-mvp',
      task_slug: 'ai-gateway-retry',
      task_type: 'implementation',
      worker_id: 'opencode',
      title: 'AI Gateway retry handling',
    });

    expect(result.entry.worker_id).toBe('opencode');
    expect(result.entry.branch_name).toMatch(/^agent\/opencode\/job-\d+\/ai-gateway-retry$/);
    expect(result.entry.target_branch).toBe('integration/chatops-mvp');
    expect(result.opsly_job_type_hint).toBe('local_opencode');
    expect(result.merge_advisor?.recommended_action).toBe('merge_to_integration');

    const entries = await listBranchEntries('intcloudsysops', REPO_ROOT);
    expect(entries.some((e) => e.id === result.entry.id)).toBe(true);
  });

  it('ChatOps dispatch plans MVP branches', async () => {
    const result = await dispatchChatOps({
      tenant_slug: 'intcloudsysops',
      action: 'plan_chatops_mvp',
      initiative: 'chatops-mvp',
    });
    expect(result.plan?.integration_branch).toBe('integration/chatops-mvp');
    expect(result.plan?.entries.length).toBe(5);
  });

  it('ChatOps dispatch infers Copilot for UI message', async () => {
    process.env.OPSLY_GIT_DRY_RUN = '1';
    const result = await dispatchChatOps({
      tenant_slug: 'intcloudsysops',
      action: 'assign_from_message',
      initiative: 'chatops-mvp',
      message: 'Polish Mission Control UI with Copilot',
    });
    expect(result.inferred?.task_type).toBe('ui');
    expect(result.assign?.entry.worker_id).toBe('copilot-cli');
  });

  it('hygiene report runs after branch plan', async () => {
    await createBranchPlan({
      tenant_slug: 'hygiene-tenant',
      initiative: 'chatops-mvp',
      tasks: [{ task_slug: 'hygiene-check', task_type: 'tests' }],
    });
    const report = await buildBranchHygieneReport({
      tenant_slug: 'hygiene-tenant',
      initiative: 'chatops-mvp',
    });
    expect(report.scanned).toBeGreaterThanOrEqual(1);
  });
});
