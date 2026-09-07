import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import {
  assignJob,
  buildSnapshot,
  classifyStatus,
  loadRegistry,
  parseHeartbeat,
  selectWorkers,
  workerMatches,
} from '../compute-worker-router.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const now = new Date('2026-09-07T03:00:00.000Z');

function freshRegistry() {
  return JSON.parse(readFileSync(join(root, 'config/compute-workers.json'), 'utf8'));
}

describe('compute-worker-router', () => {
  it('loads the committed capability registry', () => {
    const registry = loadRegistry();
    assert.equal(registry.workers[0].workerId, 'pc-gamer-openclaw-01');
    assert.ok(registry.workers[0].capabilities.includes('video.render'));
    assert.equal(registry.jobTypes['content.render.video'].queue, 'content-video');
  });

  it('matches by capability instead of hostname', () => {
    const worker = freshRegistry().workers[0];
    assert.equal(workerMatches(worker, { capabilities: ['video.render', 'ffmpeg'] }), true);
    assert.equal(workerMatches(worker, { capabilities: ['video.render'], minVramGb: 16 }), true);
    assert.equal(workerMatches(worker, { capabilities: ['video.render'], minVramGb: 48 }), false);
    assert.equal(workerMatches(worker, { capabilities: ['quantum.time-travel'] }), false);
  });

  it('parses legacy ISO heartbeats and JSON payloads', () => {
    const iso = parseHeartbeat('2026-09-07T03:00:00Z');
    assert.equal(iso?.at, '2026-09-07T03:00:00Z');
    const json = parseHeartbeat(JSON.stringify({
      workerId: 'pc-gamer-openclaw-01',
      at: '2026-09-07T02:59:30Z',
      vramGb: 16,
      activeJobs: 0,
    }));
    assert.equal(json?.vramGb, 16);
    assert.equal(parseHeartbeat(''), null);
  });

  it('classifies ONLINE BUSY DEGRADED OFFLINE', () => {
    assert.equal(classifyStatus({ heartbeat: null, now }), 'OFFLINE');
    assert.equal(
      classifyStatus({ heartbeat: { at: '2026-09-07T02:00:00Z' }, now, staleSec: 180 }),
      'OFFLINE',
    );
    assert.equal(
      classifyStatus({ heartbeat: { at: '2026-09-07T02:59:30Z', activeJobs: 0 }, now }),
      'ONLINE',
    );
    assert.equal(
      classifyStatus({
        heartbeat: { at: '2026-09-07T02:59:30Z', activeJobs: 1 },
        now,
        maxGpuJobs: 1,
      }),
      'BUSY',
    );
    assert.equal(
      classifyStatus({
        heartbeat: { at: '2026-09-07T02:59:30Z', temperatureC: 94 },
        now,
      }),
      'DEGRADED',
    );
  });

  it('leaves work queued when the capable worker is offline', () => {
    const assignment = assignJob(freshRegistry(), 'content.render.video', {}, now);
    assert.equal(assignment.ok, true);
    assert.equal(assignment.action, 'enqueue');
    assert.equal(assignment.jobStatus, 'QUEUED');
    assert.equal(assignment.workerStatus, 'OFFLINE');
    assert.equal(assignment.durability, 'bullmq');
    assert.match(assignment.note, /wait|offline/i);
  });

  it('selects an online GPU worker for content.render.video', () => {
    const selected = selectWorkers(
      freshRegistry(),
      { capabilities: ['video.render', 'ffmpeg'] },
      {
        'pc-gamer-openclaw-01': JSON.stringify({
          at: '2026-09-07T02:59:50Z',
          activeJobs: 0,
          vramGb: 16,
        }),
      },
      now,
    );
    assert.equal(selected[0].status, 'ONLINE');
    assert.equal(selected[0].worker.workerId, 'pc-gamer-openclaw-01');
  });

  it('rejects unknown jobs and capability-only image generation', () => {
    const unknown = assignJob(freshRegistry(), 'billing.charge.card', {}, now);
    assert.equal(unknown.ok, false);
    assert.equal(unknown.reason, 'unknown_job_type');
    const image = assignJob(freshRegistry(), 'content.generate.image', {}, now);
    assert.equal(image.ok, false);
    assert.equal(image.reason, 'runtime_not_installed');
  });

  it('rejects a worker that lacks the required capability', () => {
    const registry = freshRegistry();
    registry.workers[0].capabilities = ['ffmpeg'];
    const selected = selectWorkers(
      registry,
      { capabilities: ['llm.local'], minVramGb: 8 },
      {},
      now,
    );
    assert.equal(selected.length, 0);
  });

  it('builds a Mission Control snapshot without inventing a second queue', () => {
    const snap = buildSnapshot(freshRegistry(), {}, { 'content-video': { waiting: 2 } }, now);
    assert.match(snap.rule, /Cloud decides/);
    assert.equal(snap.workers[0].status, 'OFFLINE');
    assert.equal(snap.queues['content-video'].waiting, 2);
    assert.ok(snap.jobTypes.includes('ai.local.inference'));
  });
});
