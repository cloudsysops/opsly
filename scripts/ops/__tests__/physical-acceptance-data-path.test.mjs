import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('physical acceptance marker survives worker → BullMQ → job-status → runner', async () => {
  const [worker, jobsRoute, runner] = await Promise.all([
    readFile('apps/orchestrator/src/workers/local-agent-http-worker.ts', 'utf8'),
    readFile('apps/orchestrator/src/http/routes/jobs.ts', 'utf8'),
    readFile('scripts/ops/mac-go-live-e2e.sh', 'utf8'),
  ]);

  assert.match(worker, /result:\s*responseText \?\? undefined/);
  assert.match(worker, /return result/);

  assert.match(jobsRoute, /returnvalue:\s*job\.returnvalue/);
  assert.match(jobsRoute, /status:\s*state/);

  assert.match(runner, /b\.returnvalue \?\? b\.result/);
  assert.match(runner, /terminal result mismatch/);
  assert.match(runner, /OPSLY_E2E_EXPECT_MARKER/);
});
