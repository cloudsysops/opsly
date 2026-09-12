import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const path = new URL('../mac-go-live-e2e.sh', import.meta.url);

test('go-live smoke uses governed submit and verifies teardown', async () => {
  const source = await readFile(path, 'utf8');
  assert.match(source, /x-autonomy-approved: true/);
  assert.match(source, /\/api\/local\/prompt-submit/);
  assert.match(source, /\/api\/job-status\//);
  assert.match(source, /grep '\^opsly-task-'/);
  assert.match(source, /OPSLY_E2E_OK/);
  assert.match(source, /paid_infra:false/);
  assert.doesNotMatch(source, /git reset --hard|git push --force|terraform apply/);
});
