import assert from 'node:assert/strict';
import test from 'node:test';

import {
  OBS_SCOPES,
  authorizeCreatorObsAction,
  loadCreatorObsPolicy,
  runCreatorObsAction,
} from '../creator-obs-adapter.mjs';

test('OBS read actions require OBS_READ', async () => {
  const policy = await loadCreatorObsPolicy();

  assert.doesNotThrow(() =>
    authorizeCreatorObsAction({
      action: 'get_stats',
      scopes: [OBS_SCOPES.READ],
      policy,
    }),
  );

  assert.throws(
    () =>
      authorizeCreatorObsAction({
        action: 'get_stats',
        scopes: [],
        policy,
      }),
    /requires OBS_READ/,
  );
});

test('OBS control actions require OBS_CONTROL and destructive stop requires confirmation', async () => {
  const policy = await loadCreatorObsPolicy();

  assert.throws(
    () =>
      authorizeCreatorObsAction({
        action: 'stop_record',
        scopes: [OBS_SCOPES.CONTROL],
        policy,
      }),
    /requires explicit confirmation/,
  );

  assert.doesNotThrow(() =>
    authorizeCreatorObsAction({
      action: 'stop_record',
      scopes: [OBS_SCOPES.CONTROL],
      policy,
      confirmed: true,
    }),
  );
});

test('streaming actions remain blocked even with OBS_ADMIN', async () => {
  const policy = await loadCreatorObsPolicy();

  assert.throws(
    () =>
      authorizeCreatorObsAction({
        action: 'start_stream',
        scopes: [OBS_SCOPES.ADMIN],
        policy,
        confirmed: true,
      }),
    /blocked by policy/,
  );
});

test('adapter wraps canonical dispatcher output with Fair-Play provenance', async () => {
  const policy = await loadCreatorObsPolicy();
  let receivedPath = null;
  let receivedArgs = null;

  const result = await runCreatorObsAction(
    { action: 'get_record_status' },
    {
      scopes: [OBS_SCOPES.READ],
      policy,
      execute: async (path, args) => {
        receivedPath = path;
        receivedArgs = args;
        return {
          stdout: JSON.stringify({ ok: true, data: { outputActive: false } }),
          stderr: '',
        };
      },
    },
  );

  assert.match(receivedPath, /opsly-live-obs\.sh$/);
  assert.equal(JSON.parse(receivedArgs[0]).action, 'get_record_status');
  assert.equal(result.provenance.sourceClass, 'obs');
  assert.equal(result.provenance.fairPlayCertified, true);
});
