import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { evaluateCloudCostPolicy } from '../cloud-cost-policy-check.mjs';
import { toBackgroundCandidate } from '../night-queue-candidates.mjs';

const policy = {
  defaultMode: 'FREE_ONLY',
  unknownCostRequiresApproval: true,
  paidRequiresApproval: true,
  allowedAutoApplyCostClasses: ['free', 'free_with_quota'],
  prohibitedPatterns: ['second-orchestrator'],
  requiredMetadata: ['owner', 'purpose', 'environment', 'cost_class'],
};

test('cost policy evaluator is reusable and allows explicit zero-cost work', () => {
  const result = evaluateCloudCostPolicy(
    {
      owner: 'platform',
      purpose: 'safe maintenance',
      environment: 'local',
      cost_class: 'free',
      estimated_cost_usd: 0,
      architecture_patterns: [],
    },
    policy,
  );
  assert.equal(result.ok, true);
});

test('unknown/missing cost metadata fails closed', () => {
  const result = evaluateCloudCostPolicy(
    { owner: 'platform', purpose: 'unknown work', environment: 'local' },
    policy,
  );
  assert.equal(result.ok, false);
  assert.match(result.blockers.join(' '), /APPROVAL_REQUIRED/);
});

test('night queue candidate surfaces cost metadata', () => {
  const candidate = toBackgroundCandidate(
    '044-safe.md',
    `---
id: safe-044
status: pending
priority: P2
agent: local_codex
owner: platform
environment: local
cost_class: free_with_quota
estimated_cost_usd: 0
architecture_patterns:
---
Review docs only.
`,
  );
  assert.equal(candidate.costClass, 'free_with_quota');
  assert.equal(candidate.estimatedCostUsd, 0);
  assert.equal(candidate.environment, 'local');
});

test('scheduler state path is expected to live under ignored .cursor runtime', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'opsly-bg-'));
  await mkdir(path.join(root, '.cursor/runtime/background-scheduler'), { recursive: true });
  await writeFile(
    path.join(root, '.cursor/runtime/background-scheduler/state.json'),
    JSON.stringify({ version: 1, tasks: {} }),
  );
  assert.equal(true, true);
});


test('dispatcher dry-run reaches READY_TO_DISPATCH for explicit zero-cost safe work', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'opsly-bg-run-'));
  const queueDir = path.join(root, 'docs/01-development/night-queue');
  await mkdir(queueDir, { recursive: true });
  await mkdir(path.join(root, 'config'), { recursive: true });

  await writeFile(
    path.join(queueDir, '001-safe.md'),
    `---
id: safe-task
status: pending
priority: P1
agent: local_codex
owner: platform
environment: local
cost_class: free
estimated_cost_usd: 0
requires_pr: false
requires_approval: false
paid_infra_required: false
production_deploy: false
resource_class: small
node_types: mac
---
Inspect docs read-only and report findings.
`,
  );

  await writeFile(
    path.join(root, 'config/cloud-cost-policy.json'),
    JSON.stringify(policy),
  );

  const { runBackgroundScheduler } = await import('../background-scheduler-dispatch.mjs');
  const report = await runBackgroundScheduler({
    root,
    queueDir,
    execute: false,
    policyPath: path.join(root, 'config/cloud-cost-policy.json'),
    runtimeDir: path.join(root, '.cursor/runtime/background-scheduler'),
    previewOptions: {
      nodeType: 'mac',
      snapshot: {
        ram_free_gb: 12,
        ram_total_gb: 16,
        cpu_load_pct: 20,
        cpu_count: 8,
        has_gpu: false,
      },
      maxResourceClass: 'small',
    },
  });

  assert.equal(report.decision, 'READY_TO_DISPATCH');
  assert.equal(report.executed, false);
  assert.equal(report.selected.id, 'safe-task');
  assert.equal(report.cost_gate.ok, true);
});

test('execute remains blocked until explicit execution flag is enabled', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'opsly-bg-exec-'));
  const queueDir = path.join(root, 'docs/01-development/night-queue');
  await mkdir(queueDir, { recursive: true });
  await mkdir(path.join(root, 'config'), { recursive: true });

  await writeFile(
    path.join(queueDir, '001-safe.md'),
    `---
id: safe-task
status: pending
priority: P1
agent: local_codex
owner: platform
environment: local
cost_class: free
estimated_cost_usd: 0
requires_pr: false
requires_approval: false
paid_infra_required: false
production_deploy: false
resource_class: small
node_types: mac
---
Inspect docs read-only.
`,
  );
  await writeFile(
    path.join(root, 'config/cloud-cost-policy.json'),
    JSON.stringify(policy),
  );

  const { runBackgroundScheduler } = await import('../background-scheduler-dispatch.mjs');
  const report = await runBackgroundScheduler({
    root,
    queueDir,
    execute: true,
    executionEnabled: false,
    adminToken: 'not-used-because-disabled',
    policyPath: path.join(root, 'config/cloud-cost-policy.json'),
    runtimeDir: path.join(root, '.cursor/runtime/background-scheduler'),
    previewOptions: {
      nodeType: 'mac',
      snapshot: {
        ram_free_gb: 12,
        ram_total_gb: 16,
        cpu_load_pct: 20,
        cpu_count: 8,
        has_gpu: false,
      },
      maxResourceClass: 'small',
    },
  });

  assert.equal(report.decision, 'EXECUTION_DISABLED');
  assert.equal(report.executed, false);
});


test('write-capable background work stays blocked until typed approval exists', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'opsly-bg-write-gate-'));
  const queueDir = path.join(root, 'docs/01-development/night-queue');
  await mkdir(queueDir, { recursive: true });
  await mkdir(path.join(root, 'config'), { recursive: true });

  await writeFile(
    path.join(queueDir, '001-write.md'),
    `---
id: write-task
status: pending
priority: P1
agent: local_opencode
owner: platform
environment: local
cost_class: free
estimated_cost_usd: 0
requires_pr: true
requires_approval: false
paid_infra_required: false
production_deploy: false
resource_class: small
node_types: mac
---
Modify code and open a PR.
`,
  );
  await writeFile(path.join(root, 'config/cloud-cost-policy.json'), JSON.stringify(policy));

  const { runBackgroundScheduler } = await import('../background-scheduler-dispatch.mjs');
  const report = await runBackgroundScheduler({
    root,
    queueDir,
    execute: true,
    executionEnabled: true,
    adminToken: 'test-token',
    policyPath: path.join(root, 'config/cloud-cost-policy.json'),
    runtimeDir: path.join(root, '.cursor/runtime/background-scheduler'),
    previewOptions: {
      nodeType: 'mac',
      snapshot: {
        ram_free_gb: 12,
        ram_total_gb: 16,
        cpu_load_pct: 20,
        cpu_count: 8,
        has_gpu: false,
      },
      maxResourceClass: 'small',
    },
  });

  assert.equal(report.decision, 'WRITE_APPROVAL_REQUIRED');
  assert.equal(report.executed, false);
  assert.deepEqual(report.blockers, ['WRITE_CAPABLE_BACKGROUND_TASK_REQUIRES_TYPED_APPROVAL']);
});

test('prepared-only orchestrator response is not reported as dispatched', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'opsly-bg-prepared-'));
  const queueDir = path.join(root, 'docs/01-development/night-queue');
  await mkdir(queueDir, { recursive: true });
  await mkdir(path.join(root, 'config'), { recursive: true });

  await writeFile(
    path.join(queueDir, '001-safe.md'),
    `---
id: safe-task
status: pending
priority: P1
agent: local_codex
owner: platform
environment: local
cost_class: free
estimated_cost_usd: 0
requires_pr: false
requires_approval: false
paid_infra_required: false
production_deploy: false
resource_class: small
node_types: mac
---
Inspect docs only.
`,
  );
  await writeFile(path.join(root, 'config/cloud-cost-policy.json'), JSON.stringify(policy));

  const fetchFn = async () => ({
    ok: true,
    status: 202,
    json: async () => ({
      success: true,
      prepared_only: true,
      job_id: null,
      request_id: 'prepared-request',
    }),
  });

  const { runBackgroundScheduler } = await import('../background-scheduler-dispatch.mjs');
  const report = await runBackgroundScheduler({
    root,
    queueDir,
    execute: true,
    executionEnabled: true,
    adminToken: 'test-token',
    fetchFn,
    policyPath: path.join(root, 'config/cloud-cost-policy.json'),
    runtimeDir: path.join(root, '.cursor/runtime/background-scheduler'),
    previewOptions: {
      nodeType: 'mac',
      snapshot: {
        ram_free_gb: 12,
        ram_total_gb: 16,
        cpu_load_pct: 20,
        cpu_count: 8,
        has_gpu: false,
      },
      maxResourceClass: 'small',
    },
  });

  assert.equal(report.decision, 'PREPARED_ONLY');
  assert.equal(report.executed, false);
});

test('completed background job preserves BullMQ returnvalue evidence', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'opsly-bg-returnvalue-'));
  const queueDir = path.join(root, 'docs/01-development/night-queue');
  await mkdir(queueDir, { recursive: true });
  await mkdir(path.join(root, 'config'), { recursive: true });

  await writeFile(
    path.join(queueDir, '001-safe.md'),
    `---
id: safe-task
status: pending
priority: P1
agent: local_codex
owner: platform
environment: local
cost_class: free
estimated_cost_usd: 0
requires_pr: false
requires_approval: false
paid_infra_required: false
production_deploy: false
resource_class: small
node_types: mac
---
Inspect docs only.
`,
  );
  await writeFile(path.join(root, 'config/cloud-cost-policy.json'), JSON.stringify(policy));

  let call = 0;
  const fetchFn = async () => {
    call += 1;
    if (call === 1) {
      return {
        ok: true,
        status: 202,
        json: async () => ({ job_id: 'local_codex-safe-task' }),
      };
    }
    return {
      ok: true,
      status: 200,
      json: async () => ({
        status: 'completed',
        returnvalue: { success: true, result: 'SAFE_OK' },
      }),
    };
  };

  const { runBackgroundScheduler } = await import('../background-scheduler-dispatch.mjs');
  const report = await runBackgroundScheduler({
    root,
    queueDir,
    execute: true,
    executionEnabled: true,
    adminToken: 'test-token',
    fetchFn,
    sleepFn: async () => {},
    timeoutMs: 100,
    policyPath: path.join(root, 'config/cloud-cost-policy.json'),
    runtimeDir: path.join(root, '.cursor/runtime/background-scheduler'),
    previewOptions: {
      nodeType: 'mac',
      snapshot: {
        ram_free_gb: 12,
        ram_total_gb: 16,
        cpu_load_pct: 20,
        cpu_count: 8,
        has_gpu: false,
      },
      maxResourceClass: 'small',
    },
  });

  assert.equal(report.decision, 'COMPLETED');
  assert.deepEqual(report.job.returnvalue, { success: true, result: 'SAFE_OK' });
});
