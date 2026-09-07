import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTION,
  PHASE,
  deployJobsForEvent,
  evaluateReleaseAction,
  imageTagsForBuild,
  isNightWindow,
  planProductionRollback,
  resolveGpuProbe,
  scheduledMergeCronsUtc,
  scheduledPromoteCronsUtc,
  skipExternalGpuProbe,
} from '../release-pipeline.mjs';

/** 01:00 America/Bogota on 2026-09-07 (inside window). */
const INSIDE = new Date('2026-09-07T06:00:00Z');
/** 06:10 America/Bogota — GitHub delayed the 01:00 cron (outside window). */
const DELAYED_OUTSIDE = new Date('2026-09-07T11:10:00Z');
/** 15:00 America/Bogota weekday. */
const DAYTIME = new Date('2026-09-07T20:00:00Z');

test('scheduled run inside window allows promote', () => {
  assert.equal(isNightWindow(INSIDE), true);
  const r = evaluateReleaseAction({
    phase: PHASE.PROMOTE,
    eventName: 'schedule',
    now: INSIDE,
    rcSha: 'aaa',
    productionSha: 'bbb',
  });
  assert.equal(r.action, ACTION.ALLOW);
  assert.equal(r.exitCode, 0);
  assert.equal(r.productionTouched, true);
});

test('delayed scheduler run outside window skips promote (does not fail)', () => {
  assert.equal(isNightWindow(DELAYED_OUTSIDE), false);
  const r = evaluateReleaseAction({
    phase: PHASE.PROMOTE,
    eventName: 'schedule',
    now: DELAYED_OUTSIDE,
    rcSha: 'aaa',
    productionSha: 'bbb',
  });
  assert.equal(r.action, ACTION.SKIP);
  assert.equal(r.exitCode, 0);
  assert.equal(r.productionTouched, false);
  assert.match(r.reason, /skip/i);
});

test('approved PR merge is allowed outside the production window', () => {
  const r = evaluateReleaseAction({
    phase: PHASE.MERGE,
    eventName: 'schedule',
    now: DELAYED_OUTSIDE,
    approvedPr: true,
    ciGreen: true,
  });
  assert.equal(r.action, ACTION.ALLOW);
  assert.equal(r.exitCode, 0);
  assert.equal(r.productionTouched, false);
});

test('staging deployment is allowed on main merge at any hour', () => {
  const r = evaluateReleaseAction({
    phase: PHASE.STAGING,
    eventName: 'push',
    now: DAYTIME,
  });
  assert.equal(r.action, ACTION.ALLOW);
  assert.equal(r.productionTouched, false);

  const jobs = deployJobsForEvent({ eventName: 'push', refName: 'main' });
  assert.equal(jobs.deployStaging, true);
  assert.equal(jobs.deployProduction, false);
});

test('production remains untouched by a normal main merge', () => {
  const tags = imageTagsForBuild({ refName: 'main' });
  assert.equal(tags.latest, false);
  assert.equal(tags.staging, true);
  assert.equal(tags.sha, true);
  assert.equal(tags.rc, true);

  const jobs = deployJobsForEvent({ eventName: 'push', refName: 'main' });
  assert.equal(jobs.deployProduction, false);
  assert.equal(jobs.deployPeskidsProduction, false);
  assert.equal(jobs.deployPaniniProduction, false);
  assert.equal(jobs.deployStaging, true);
});

test('production promotion inside window is allowed', () => {
  const r = evaluateReleaseAction({
    phase: PHASE.PROMOTE,
    eventName: 'workflow_dispatch',
    now: INSIDE,
    rcSha: 'rc1',
    productionSha: 'prod0',
  });
  assert.equal(r.action, ACTION.ALLOW);
  assert.equal(r.productionTouched, true);

  const jobs = deployJobsForEvent({
    eventName: 'workflow_dispatch',
    refName: 'main',
    phase: 'promote',
  });
  assert.equal(jobs.deployProduction, true);
  assert.equal(jobs.deployStaging, false);
});

test('production promotion outside window is denied for dispatch', () => {
  const r = evaluateReleaseAction({
    phase: PHASE.PROMOTE,
    eventName: 'workflow_dispatch',
    now: DAYTIME,
    rcSha: 'rc1',
    productionSha: 'prod0',
  });
  assert.equal(r.action, ACTION.DENY);
  assert.equal(r.exitCode, 1);
  assert.equal(r.productionTouched, false);
});

test('rollback path opens a hotfix revert toward sha-before', () => {
  const plan = planProductionRollback({
    shaBefore: 'abc123',
    shaAfter: 'def456',
    smokeFailed: true,
  });
  assert.equal(plan.ok, true);
  assert.equal(plan.method, 'revert-pr');
  assert.equal(plan.retagLatestFrom, 'abc123');
  assert.deepEqual(plan.labels, ['hotfix-prod']);
});

test('duplicate promote of the same SHA is idempotent', () => {
  const same = evaluateReleaseAction({
    phase: PHASE.PROMOTE,
    eventName: 'schedule',
    now: INSIDE,
    rcSha: 'same-sha',
    productionSha: 'same-sha',
  });
  assert.equal(same.action, ACTION.SKIP);
  assert.equal(same.exitCode, 0);
  assert.equal(same.productionTouched, false);

  const last = evaluateReleaseAction({
    phase: PHASE.PROMOTE,
    eventName: 'workflow_dispatch',
    now: INSIDE,
    rcSha: 'rc-sha',
    productionSha: 'other',
    lastPromotedSha: 'rc-sha',
  });
  assert.equal(last.action, ACTION.SKIP);
});

test('TAP process skips gpu child spawn when probes are injected', () => {
  let queried = false;
  const gpu = resolveGpuProbe(
    { ollama: true, localAgents: true, ffmpeg: false },
    () => {
      queried = true;
      return { gpuModel: 'should-not-run' };
    }
  );
  assert.equal(queried, false);
  assert.deepEqual(gpu, {});
  assert.equal(skipExternalGpuProbe({ ollama: true }), true);
  assert.equal(skipExternalGpuProbe({}), false);
});

test('in-window promote crons stay inside 22:00-06:00 Bogotá', () => {
  const crons = scheduledPromoteCronsUtc();
  assert.ok(crons.length >= 4);
  assert.ok(crons.some((c) => c.utc === '0 6 * * *'));
  for (const c of crons) {
    const [minute, hour] = c.utc.split(' ');
    assert.equal(minute, '0');
    const utcHour = Number(hour);
    const bogotaHour = (utcHour - 5 + 24) % 24;
    assert.ok(
      bogotaHour >= 22 || bogotaHour < 6,
      `promote cron ${c.utc} maps to ${bogotaHour}:00 Bogotá (outside window)`
    );
  }
});

test('merge catch-up crons exist for delayed overnight runs', () => {
  const crons = scheduledMergeCronsUtc();
  assert.ok(crons.some((c) => c.bogota === '09:00'));
});

test('deploy.yml no longer tags :latest on main and production job is disabled', async () => {
  const { readFileSync } = await import('node:fs');
  const yaml = readFileSync(new URL('../../../.github/workflows/deploy.yml', import.meta.url), 'utf8');
  assert.equal(yaml.includes('intcloudsysops-api:latest'), false);
  assert.match(yaml, /# Production SSH lives in promote-production.yml[\s\S]*if: false/);
  const peskids = readFileSync(
    new URL('../../../.github/workflows/deploy-peskids.yml', import.meta.url),
    'utf8'
  );
  assert.match(peskids, /if: github.event_name == 'workflow_dispatch'/);
  assert.equal(peskids.includes('peskids:latest'), false);
});
