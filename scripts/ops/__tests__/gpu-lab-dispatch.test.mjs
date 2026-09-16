import test from 'node:test';
import assert from 'node:assert/strict';

import { buildAssignmentPayload } from '../board-assign-gpu-job.mjs';
import { loadRegistry } from '../compute-worker-router.mjs';
import {
  loadLabTasks,
  planGpuLab,
  requestIdForTask,
  selectLabTasks,
} from '../gpu-lab-dispatch.mjs';

test('builds Ollama payloads from queue/job contract for content.review', () => {
  const assignment = {
    ok: true,
    queue: 'openclaw',
    jobName: 'ollama',
    jobType: 'content.review',
    workerId: 'home-gpu-01',
  };
  const built = buildAssignmentPayload(assignment, {
    tenantSlug: 'intcloudsysops',
    prompt: 'review synthetic content',
    title: 'unused',
    requestId: 'gpu-lab-review-1',
    source: 'gpu-lab',
  });

  assert.equal(built.requestId, 'gpu-lab-review-1');
  assert.equal(built.payload.type, 'ollama');
  assert.equal(built.payload.payload.task_type, 'review');
  assert.equal(built.payload.payload.prompt, 'review synthetic content');
  assert.equal(built.payload.metadata.source, 'gpu-lab');
  assert.equal(built.payload.metadata.planner_preferred_worker_id, 'home-gpu-01');
});

test('keeps content-video jobs on the render payload contract', () => {
  const assignment = {
    ok: true,
    queue: 'content-video',
    jobName: 'render',
    jobType: 'content.render.video',
    workerId: 'pc-gamer-openclaw-01',
  };
  const built = buildAssignmentPayload(assignment, {
    tenantSlug: 'intcloudsysops',
    prompt: 'unused',
    title: 'Opsly lab render',
    requestId: 'gpu-lab-render-1',
    source: 'gpu-lab',
  });

  assert.equal(built.payload.tenant_slug, 'intcloudsysops');
  assert.equal(built.payload.draft.title, 'Opsly lab render');
  assert.equal(built.payload.preset.slug, 'board-gpu-smoke');
  assert.deepEqual(built.payload.draft.compliance_flags, ['not_peskids', 'no_customer_pii']);
});

test('lab manifest exposes only bounded enabled work by default', () => {
  const manifest = loadLabTasks();
  const selected = selectLabTasks(manifest);
  assert.ok(selected.length > 0);
  assert.ok(selected.length <= manifest.policy.max_tasks_per_dispatch);
  assert.ok(selected.every((task) => task.enabled === true));
  assert.ok(!selected.some((task) => task.id === 'lab-image-generation'));
  assert.ok(!selected.some((task) => task.id === 'lab-transcription'));
});

test('request id is stable inside a cadence bucket', () => {
  const task = { id: 'lab-gpu-runtime-smoke', cadence: 'hourly' };
  const a = requestIdForTask(task, new Date('2026-09-16T12:05:00.000Z'));
  const b = requestIdForTask(task, new Date('2026-09-16T12:59:59.000Z'));
  const c = requestIdForTask(task, new Date('2026-09-16T13:00:00.000Z'));
  assert.equal(a, b);
  assert.notEqual(a, c);
});

test('planner prefers an ONLINE capable worker from heartbeat truth', async () => {
  const registry = loadRegistry();
  const manifest = loadLabTasks();
  const now = new Date('2026-09-16T12:00:00.000Z');
  const heartbeats = {
    'pc-gamer-openclaw-01': JSON.stringify({
      at: '2026-09-16T11:00:00.000Z',
      workerId: 'pc-gamer-openclaw-01',
      activeJobs: 0,
      vramGb: 16.3,
      vramUsedGb: 1,
    }),
    'home-gpu-01': JSON.stringify({
      at: '2026-09-16T11:59:30.000Z',
      workerId: 'home-gpu-01',
      activeJobs: 0,
      vramGb: 12,
      vramUsedGb: 1,
    }),
  };

  const [plan] = await planGpuLab({
    now,
    registry,
    manifest,
    taskId: 'lab-gpu-runtime-smoke',
    heartbeats,
  });

  assert.equal(plan.assignment.ok, true);
  assert.equal(plan.assignment.workerId, 'home-gpu-01');
  assert.equal(plan.assignment.workerStatus, 'ONLINE');
});
