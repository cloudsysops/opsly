import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { driveStageReady, stageVideoToDrive } from '../drive-stage.mjs';

describe('drive-stage', () => {
  it('ready checks required env', () => {
    assert.equal(driveStageReady({}).ok, false);
    assert.equal(
      driveStageReady({
        GOOGLE_SERVICE_ACCOUNT_JSON: '{}',
        OPSLY_DRIVE_ROOT_FOLDER_ID: 'x',
      }).ok,
      true
    );
  });

  it('uploads, shares anyone, returns public url', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oad-drv-'));
    const video = path.join(dir, 'clip.mp4');
    fs.writeFileSync(video, Buffer.alloc(4));
    const calls = [];
    const drive = {
      files: {
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
    assert.ok(calls.some((c) => c[0] === 'perm' && c[1].type === 'anyone'));
  });
});
