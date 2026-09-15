import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const file = new URL('../install-background-scheduler-launchd.sh', import.meta.url);

test('launchd installer requires GO LIVE evidence before enable', async () => {
  const source = await readFile(file, 'utf8');
  assert.match(source, /mac-go-live-\*\.json/);
  assert.match(source, /healthy_idle_restored/);
  assert.match(source, /pre_task_sessions/);
  assert.match(source, /post_task_sessions/);
  assert.match(source, /--enable/);
});

test('launchd job uses governed dispatcher and Doppler, never embeds token', async () => {
  const source = await readFile(file, 'utf8');
  assert.match(source, /opsly:background:dispatch:execute/);
  assert.match(source, /doppler run --project ops-intcloudsysops --config prd/);
  assert.doesNotMatch(source, /PLATFORM_ADMIN_TOKEN=.{8,}/);
  assert.doesNotMatch(source, /openai api key|anthropic api key/i);
});

test('launchd cadence defaults to ten minutes and remains low priority', async () => {
  const source = await readFile(file, 'utf8');
  assert.match(source, /:-600/);
  assert.match(source, /<key>LowPriorityIO<\/key>/);
  assert.match(source, /<true\/>/);
});
