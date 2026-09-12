import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSchedulerPreview } from '../background-scheduler-preview.mjs';

test('preview selects safe P1 work on an idle Mac without enqueueing', async () => {
  const report = await buildSchedulerPreview({
    nodeType: 'mac',
    snapshot: {
      ram_free_gb: 12,
      ram_total_gb: 16,
      cpu_load_pct: 20,
      cpu_count: 8,
      has_gpu: false,
    },
    candidates: [
      {
        id: 'docs-drift',
        title: 'Docs drift',
        status: 'pending',
        priority: 'P2',
        runtime: 'claude',
        nodeTypes: ['mac'],
        resourceClass: 'small',
        blocked: false,
        requiresApproval: false,
        paidInfraRequired: false,
        productionDeploy: false,
        activeElsewhere: false,
        safeAutonomy: true,
        estimatedMinutes: 15,
      },
      {
        id: 'ci-triage',
        title: 'CI triage',
        status: 'pending',
        priority: 'P1',
        runtime: 'codex',
        nodeTypes: ['mac'],
        resourceClass: 'small',
        blocked: false,
        requiresApproval: false,
        paidInfraRequired: false,
        productionDeploy: false,
        activeElsewhere: false,
        safeAutonomy: true,
        estimatedMinutes: 10,
      },
    ],
  });

  assert.equal(report.mode, 'preview-only');
  assert.equal(report.decision, 'RUN');
  assert.equal(report.selected.id, 'ci-triage');
});

test('preview reports no capacity on coordinator VPS', async () => {
  const report = await buildSchedulerPreview({
    nodeType: 'vps',
    snapshot: {
      ram_free_gb: 32,
      ram_total_gb: 64,
      cpu_load_pct: 5,
      cpu_count: 16,
      has_gpu: false,
    },
    candidates: [],
  });
  assert.equal(report.decision, 'NO_CAPACITY');
});
