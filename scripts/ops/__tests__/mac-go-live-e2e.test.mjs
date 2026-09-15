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
  assert.match(source, /OPSLY_E2E_EXPECT_MARKER/);
  assert.match(source, /prepared_only/);
  assert.match(source, /b\.returnvalue \?\? b\.result/);
  assert.match(source, /terminal result mismatch/);
  assert.match(source, /runtime smoke mutated the repository working tree/);
  assert.match(source, /openclaw-readonly-policy-doctor\.sh/);
  assert.match(source, /cancelled/);
  assert.match(source, /paid_infra:false/);
  assert.doesNotMatch(source, /git reset --hard|git push --force|terraform apply/);
});


test('OpenClaw physical smoke uses a bounded temporary worker without repo config mutation', async () => {
  const source = await readFile(scriptFile, 'utf8');

  assert.match(source, /opsly-acceptance-openclaw-worker/);
  assert.match(source, /OPSLY_OPENCLAW_ACCEPTANCE_ENABLED=true/);
  assert.match(source, /OPSLY_LOCAL_AGENT_KINDS=local_openclaw/);
  assert.match(source, /ORCHESTRATOR_HEALTH_PORT=0/);
  assert.match(source, /start-mac-local-agents-worker\.sh/);
  assert.match(source, /tmux kill-session -t "\$OPENCLAW_ACCEPTANCE_WORKER_SESSION"/);
  assert.match(source, /Unified worker ready on local-agents queue/);

  assert.doesNotMatch(source, /config set .*openclaw/i);
  assert.doesNotMatch(source, /sed .*agent-services/);
  assert.doesNotMatch(source, /git (checkout|switch|reset|pull)/);
});
