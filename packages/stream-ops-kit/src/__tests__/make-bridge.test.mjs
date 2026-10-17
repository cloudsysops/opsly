import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMakeSocialAdapter } from '../make-bridge.mjs';

describe('make-bridge', () => {
  it('ready fails without webhook or drive secrets', () => {
    const a = createMakeSocialAdapter({ env: {}, platform: 'tiktok' });
    const r = a.ready();
    assert.equal(r.ok, false);
    assert.ok(r.missing.includes('MAKE_OPSAFTERDARK_WEBHOOK_URL'));
    assert.ok(r.missing.includes('GOOGLE_SERVICE_ACCOUNT_JSON'));
  });

  it('publish stages to Drive then posts JSON without local paths', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oad-make-'));
    const video = path.join(dir, 'v.mp4');
    fs.writeFileSync(video, Buffer.alloc(16));
    let seen;
    const a = createMakeSocialAdapter({
      env: {
        MAKE_OPSAFTERDARK_WEBHOOK_URL: 'https://hook.example/test',
        GOOGLE_SERVICE_ACCOUNT_JSON: '{"type":"service_account"}',
        OPSLY_DRIVE_ROOT_FOLDER_ID: 'root1',
      },
      platform: 'tiktok',
      toLocalPathFn: (p) => p,
      stageFn: async () => ({
        fileId: 'fid1',
        publicUrl: 'https://drive.google.com/uc?export=download&id=fid1',
        webViewLink: 'https://drive.google.com/file/d/fid1/view',
        folderId: 'fold1',
      }),
      fetchImpl: async (url, init) => {
        seen = { url, init };
        return { ok: true, status: 200, text: async () => '{"executionId":"ex1"}' };
      },
    });
    const r = await a.publish({
      id: 'e1',
      caption: 'hi #gaming',
      vertical: video,
      platforms: ['tiktok'],
      scheduledAt: '2026-10-17T19:00',
      timezone: 'America/New_York',
    });
    assert.equal(seen.url, 'https://hook.example/test');
    const body = JSON.parse(seen.init.body);
    assert.equal(body.vertical.public_url, 'https://drive.google.com/uc?export=download&id=fid1');
    assert.equal(body.vertical.drive_file_id, 'fid1');
    assert.equal(body.vertical.path, undefined);
    assert.equal(body.vertical.path_posix, undefined);
    assert.ok(!JSON.stringify(body).includes('D:\\'));
    assert.ok(!JSON.stringify(body).includes('/mnt/'));
    assert.equal(r.state, 'delivered_to_make');
    assert.equal(r.url, body.vertical.public_url);
  });
});
