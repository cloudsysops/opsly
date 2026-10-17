import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  assertStagingRootWritable,
  driveStageReady,
  stageVideoToDrive,
  sweepDriveStaging,
} from '../drive-stage.mjs';

describe('drive-stage', () => {
  it('ready accepts SA or user OAuth plus root folder', () => {
    assert.equal(driveStageReady({}).ok, false);
    assert.equal(
      driveStageReady({
        GOOGLE_SERVICE_ACCOUNT_JSON: '{}',
        OPSLY_DRIVE_ROOT_FOLDER_ID: 'x',
      }).ok,
      true,
    );
    assert.equal(
      driveStageReady({
        GOOGLE_USER_CREDENTIALS_JSON: '{"client_id":"a","client_secret":"b","refresh_token":"c"}',
        OPSLY_DRIVE_ROOT_FOLDER_ID: 'x',
      }).ok,
      true,
    );
    assert.ok(
      driveStageReady({ OPSLY_DRIVE_ROOT_FOLDER_ID: 'x' }).missing.includes(
        'GOOGLE_USER_CREDENTIALS_JSON|GOOGLE_SERVICE_ACCOUNT_JSON',
      ),
    );
  });

  it('rejects SA against My Drive root (no driveId)', async () => {
    const drive = {
      files: {
        get: async () => ({ data: { id: 'root1', name: 'My folder', driveId: null } }),
      },
    };
    await assert.rejects(
      () => assertStagingRootWritable(drive, 'root1', 'sa'),
      /Shared Drive|GOOGLE_USER_CREDENTIALS_JSON/,
    );
  });

  it('uploads, shares anyone, returns public url', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oad-drv-'));
    const video = path.join(dir, 'clip.mp4');
    fs.writeFileSync(video, Buffer.alloc(4));
    const calls = [];
    const drive = {
      files: {
        get: async () => ({ data: { id: 'root1', name: 'shared-root', driveId: 'driveShared1' } }),
        list: async () => ({ data: { files: [] } }),
        create: async (req) => {
          calls.push(['create', req.requestBody?.name || req.requestBody?.mimeType]);
          if (req.requestBody?.mimeType === 'application/vnd.google-apps.folder') {
            return { data: { id: 'folder-new' } };
          }
          return { data: { id: 'file1', webViewLink: 'https://drive.google.com/file/d/file1/view' } };
        },
      },
      permissions: {
        create: async (req) => {
          calls.push(['perm', req.requestBody]);
          return { data: {} };
        },
      },
    };
    const r = await stageVideoToDrive({
      filePath: video,
      fileName: 'clip.mp4',
      env: {
        GOOGLE_SERVICE_ACCOUNT_JSON: JSON.stringify({ type: 'service_account' }),
        OPSLY_DRIVE_ROOT_FOLDER_ID: 'root1',
      },
      drive,
    });
    assert.equal(r.fileId, 'file1');
    assert.equal(r.publicUrl, 'https://drive.google.com/uc?export=download&id=file1');
    assert.equal(r.authKind, 'sa');
    assert.ok(calls.some((c) => c[0] === 'perm' && c[1].type === 'anyone'));
  });
});

describe('sweepDriveStaging', () => {
  const env = {
    GOOGLE_SERVICE_ACCOUNT_JSON: '{"type":"service_account"}',
    OPSLY_DRIVE_ROOT_FOLDER_ID: 'root1',
    MAKE_OPSAFTERDARK_DRIVE_FOLDER_ID: 'fold1',
  };
  const mk = (files) => {
    const calls = [];
    return {
      calls,
      drive: {
        files: {
          list: async (req) => {
            calls.push(['list', req.q]);
            return { data: { files } };
          },
          delete: async (req) => {
            calls.push(['delete', req.fileId]);
          },
        },
      },
    };
  };
  it('deletes only expired files from the staging folder using a 48h cutoff', async () => {
    const { drive, calls } = mk([{ id: 'old1' }, { id: 'old2' }]);
    const nowMs = Date.parse('2026-10-20T12:00:00Z');
    const r = await sweepDriveStaging({ env, drive, nowMs });
    assert.deepEqual(r.deleted, ['old1', 'old2']);
    const q = calls.find((c) => c[0] === 'list')[1];
    assert.match(q, /'fold1' in parents/);
    assert.match(q, /createdTime < '2026-10-18T12:00:00.000Z'/);
    assert.deepEqual(
      calls.filter((c) => c[0] === 'delete').map((c) => c[1]),
      ['old1', 'old2'],
    );
  });
  it('dry run deletes nothing and a failed delete is reported without throwing', async () => {
    const a = mk([{ id: 'x' }]);
    const r = await sweepDriveStaging({ env, drive: a.drive, dry: true });
    assert.deepEqual(r.deleted, ['x']);
    assert.ok(!a.calls.some((c) => c[0] === 'delete'));
    const b = {
      files: {
        list: async () => ({ data: { files: [{ id: 'y' }] } }),
        delete: async () => {
          throw new Error('403 nope');
        },
      },
    };
    const r2 = await sweepDriveStaging({ env, drive: b });
    assert.equal(r2.deleted.length, 0);
    assert.equal(r2.errors.length, 1);
  });
  it('skips when Drive is not configured', async () => {
    const r = await sweepDriveStaging({ env: {} });
    assert.ok(r.skipped);
  });
});
