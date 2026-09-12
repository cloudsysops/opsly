import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { inspectExternalService } from '../external-services-doctor.mjs';

function fakeGit(values) {
  return async (_cmd, args) => {
    const joined = args.join(' ');
    if (joined === 'rev-parse HEAD') return { stdout: values.sha + '\n' };
    if (joined === 'describe --tags --exact-match') return { stdout: values.tag + '\n' };
    if (joined === 'rev-parse --abbrev-ref HEAD') return { stdout: (values.branch ?? 'HEAD') + '\n' };
    throw new Error('unexpected git call');
  };
}

test('reports ready for detached exact reviewed tag and matching pin', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'opsly-ext-'));
  const dir = path.join(home, '.opsly/external-services/demo');
  await mkdir(path.join(dir, '.git'), { recursive: true });
  await writeFile(
    path.join(dir, '.opsly-pin.json'),
    JSON.stringify({
      repository: 'https://github.com/example/demo.git',
      reviewed_ref: 'v1.2.3',
      resolved_tag: 'v1.2.3',
      resolved_sha: 'abc123',
    }),
  );

  const row = await inspectExternalService(
    'demo',
    {
      displayName: 'Demo',
      repository: 'https://github.com/example/demo.git',
      installPath: '~/.opsly/external-services/demo',
      reviewedRef: 'v1.2.3',
    },
    { homeDir: home, execFn: fakeGit({ sha: 'abc123', tag: 'v1.2.3' }) },
  );

  assert.equal(row.state, 'ready');
  assert.deepEqual(row.blockers, []);
});

test('fails closed on branch checkout or SHA drift', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'opsly-ext-'));
  const dir = path.join(home, '.opsly/external-services/demo');
  await mkdir(path.join(dir, '.git'), { recursive: true });
  await writeFile(
    path.join(dir, '.opsly-pin.json'),
    JSON.stringify({
      repository: 'https://github.com/example/demo.git',
      reviewed_ref: 'v1.2.3',
      resolved_tag: 'v1.2.3',
      resolved_sha: 'oldsha',
    }),
  );

  const row = await inspectExternalService(
    'demo',
    {
      repository: 'https://github.com/example/demo.git',
      installPath: '~/.opsly/external-services/demo',
      reviewedRef: 'v1.2.3',
    },
    { homeDir: home, execFn: fakeGit({ sha: 'newsha', tag: 'v1.2.3', branch: 'main' }) },
  );

  assert.equal(row.state, 'drifted');
  assert.match(row.blockers.join(' '), /branch 'main'/);
  assert.match(row.blockers.join(' '), /pinned SHA/);
});

test('missing clone is warning, not fabricated ready', async () => {
  const home = await mkdtemp(path.join(os.tmpdir(), 'opsly-ext-'));
  const row = await inspectExternalService(
    'demo',
    {
      installPath: '~/.opsly/external-services/demo',
      reviewedRef: 'v1',
    },
    { homeDir: home },
  );
  assert.equal(row.state, 'missing');
  assert.match(row.warnings.join(' '), /not cloned/);
});
