import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '../../..');

test('inventory distinguishes technical failures from policy/review gates', async () => {
  const source = await fs.readFile(path.join(root, 'scripts/ops/pr-reconciliation-inventory.mjs'), 'utf8');
  assert.match(source, /config\/pr-triage-policy\.json/);
  assert.match(source, /ignored_check_patterns/);
  assert.match(source, /commits\/\$\{pull\.head\.sha\}\/status/);
  assert.match(source, /opsly-independent-review/);
  assert.match(source, /review\.commit_id === headSha/);
});

test('workpacks include protected PRs for review but never protected branch mutation', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'reconcile-flow-'));
  const input = path.join(dir, 'inventory.json');
  const output = path.join(dir, 'workpacks.json');
  await fs.writeFile(input, JSON.stringify({
    repository: 'cloudsysops/opsly',
    pullRequests: [
      {
        number: 1, title: 'protected stale review', lane: 'REVIEW_BLOCKED',
        head: 'a', headSha: 'aaa', base: 'main', protected: true,
        supersededBy: [], behindBy: 0, aheadBy: 1, changesRequested: false,
        independentReview: { state: 'failure', needsRun: true },
      },
      {
        number: 2, title: 'safe failing CI', lane: 'CHECK_FAILED',
        head: 'b', headSha: 'bbb', base: 'main', protected: false,
        supersededBy: [], behindBy: 0, aheadBy: 1, changesRequested: false,
        independentReview: { state: 'missing', needsRun: true },
      },
      {
        number: 3, title: 'protected failing CI', lane: 'CHECK_FAILED',
        head: 'c', headSha: 'ccc', base: 'main', protected: true,
        supersededBy: [], behindBy: 0, aheadBy: 1, changesRequested: false,
        independentReview: { state: 'missing', needsRun: true },
      },
      {
        number: 4, title: 'safe review blocker', lane: 'REVIEW_BLOCKED',
        head: 'd', headSha: 'ddd', base: 'main', protected: false,
        supersededBy: [], behindBy: 0, aheadBy: 1, changesRequested: true,
        independentReview: { state: 'failure', needsRun: false },
      },
    ],
  }));

  const run = spawnSync(process.execPath, ['scripts/ops/pr-reconciliation-workpacks.mjs'], {
    cwd: root,
    env: {
      ...process.env,
      RECONCILIATION_INVENTORY: input,
      RECONCILIATION_WORKPACKS: output,
    },
    encoding: 'utf8',
  });
  assert.equal(run.status, 0, run.stderr);
  const payload = JSON.parse(await fs.readFile(output, 'utf8'));
  const byPr = new Map(payload.workpacks.map((item) => [item.prNumber, item]));

  assert.equal(byPr.get(1).operation, 'REQUEST_INDEPENDENT_REVIEW');
  assert.equal(byPr.get(1).writeAllowed, false);
  assert.equal(byPr.get(2).operation, 'REPAIR');
  assert.equal(byPr.get(2).writeAllowed, true);
  assert.equal(byPr.get(3).operation, 'DIAGNOSE_ONLY');
  assert.equal(byPr.get(3).writeAllowed, false);
  assert.equal(byPr.get(4).operation, 'REPAIR_REVIEW_BLOCKER');
  assert.equal(byPr.get(4).writeAllowed, true);
});

test('controller workflow executes bounded dispatch and reviewer supports explicit PR redispatch', async () => {
  const controller = await fs.readFile(path.join(root, '.github/workflows/pr-reconciliation-inventory.yml'), 'utf8');
  const reviewer = await fs.readFile(path.join(root, '.github/workflows/backend-independent-review.yml'), 'utf8');
  assert.match(controller, /pr-reconciliation-dispatch\.mjs/);
  assert.match(controller, /actions: write/);
  assert.match(controller, /RECONCILIATION_MAX_DISPATCH: '8'/);
  assert.match(reviewer, /workflow_dispatch:/);
  assert.match(reviewer, /pr_number:/);
  assert.match(reviewer, /inputs\.pr_number/);
});


test('PR Doctor supports exact-head review repair without weakening reviewer policy', async () => {
  const source = await fs.readFile(path.join(root, 'scripts/ci/pr-doctor.mjs'), 'utf8');
  assert.match(source, /--review-blocked/);
  assert.match(source, /review\.commit_id === pr\.head\.sha/);
  assert.match(source, /PR Doctor: review fix dispatched for/);
  assert.match(source, /No toques production-change-window ni debilites opsly-independent-review/);
  assert.match(source, /conflict_key: `pr-reconcile\/pr-\$\{pr\.number\}`/);
});
