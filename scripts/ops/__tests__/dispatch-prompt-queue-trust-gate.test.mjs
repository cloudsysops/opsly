import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

// Automatic-dispatch trust gate: an unattended execution machine must not
// treat "whatever branch happens to be checked out" as the task source.
// These tests exercise only the gate itself via --dry-run (read-only,
// no git mutation, no process spawning) using DISPATCH_QUEUE_TEST_BRANCH
// as a test-only seam — never set outside this test file.

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const script = join(root, 'scripts/ops/dispatch-prompt-queue.sh');

function run(env) {
  return execFileSync('bash', [script, '--dry-run'], {
    cwd: root,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

describe('dispatch-prompt-queue.sh trust gate', () => {
  it('proceeds when the checked-out branch matches the trusted branch (default main)', () => {
    const out = run({ DISPATCH_QUEUE_TEST_BRANCH: 'main' });
    assert.match(out, /on trusted branch main/);
    assert.doesNotMatch(out, /refusing automatic dispatch/);
  });

  it('refuses automatic dispatch on a non-trusted branch', () => {
    const out = run({ DISPATCH_QUEUE_TEST_BRANCH: 'feature-x' });
    assert.match(out, /checked out branch 'feature-x' is not the trusted branch 'main' — refusing automatic dispatch/);
  });

  it('refuses automatic dispatch on detached HEAD', () => {
    const out = run({ DISPATCH_QUEUE_TEST_BRANCH: 'HEAD' });
    assert.match(out, /detached HEAD — not the trusted branch \(main\), refusing automatic dispatch/);
  });

  it('honors a configured trusted branch other than main', () => {
    const out = run({ DISPATCH_QUEUE_TEST_BRANCH: 'release', NIGHT_QUEUE_TRUSTED_BRANCH: 'release' });
    assert.match(out, /on trusted branch release/);
    assert.doesNotMatch(out, /refusing automatic dispatch/);
  });

  it('still refuses when configured trusted branch does not match checkout', () => {
    const out = run({ DISPATCH_QUEUE_TEST_BRANCH: 'main', NIGHT_QUEUE_TRUSTED_BRANCH: 'release' });
    assert.match(out, /checked out branch 'main' is not the trusted branch 'release' — refusing automatic dispatch/);
  });
});
