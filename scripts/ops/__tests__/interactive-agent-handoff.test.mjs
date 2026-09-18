import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const repoRoot = path.resolve(process.cwd());
const script = path.join(repoRoot, 'scripts/ops/interactive-agent-handoff.mjs');

test('renders a governed human-relay handoff without creating another queue', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'opsly-handoff-'));
  const workpack = path.join(dir, 'workpack.md');
  await writeFile(workpack, `---
id: sf-demo
title: Mission Control slice
owner: chatgpt
priority: high
workstream: mission-control.dashboard
conflict_key: mission-control-ui
depends_on: none
environment: development
requires_pr: true
requires_approval: false
production_deploy: false
paid_infra_required: false
---
Implement only the dashboard slice.
`, 'utf8');

  const result = spawnSync(process.execPath, [script, workpack], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Opsly Interactive Agent Handoff v1/);
  assert.match(result.stdout, /Transport: human_relay \/ interactive_subscription/);
  assert.match(result.stdout, /Work ID: sf-demo/);
  assert.match(result.stdout, /Requires PR: true/);
  assert.match(result.stdout, /Production deploy allowed by workpack: false/);
  assert.match(result.stdout, /Do not create another scheduler, registry, approval store, task store, or execution queue/);
  assert.match(result.stdout, /pr_url/);
  assert.match(result.stdout, /opsly-work-evidence-v1/);
  assert.match(result.stdout, /\"work_id\":\"sf-demo\"/);
  assert.match(result.stdout, /\"transport\":\"human_relay\"/);
  assert.match(result.stdout, /head_sha/);
  assert.match(result.stdout, /merge_readiness/);
  assert.match(result.stdout, /Do not return private chain-of-thought/);
});

test('fails closed when required workpack identity is missing', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'opsly-handoff-invalid-'));
  const workpack = path.join(dir, 'workpack.md');
  await writeFile(workpack, `---
owner: chatgpt
priority: high
---
Missing id.
`, 'utf8');

  const result = spawnSync(process.execPath, [script, workpack], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /missing required frontmatter field: id/);
});
