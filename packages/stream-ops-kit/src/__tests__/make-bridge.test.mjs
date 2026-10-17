import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createMakeSocialAdapter, MAKE_REQUIRED_ENV } from '../make-bridge.mjs';

describe('make-bridge', () => {
  it('ready fails without webhook', () => {
    const a = createMakeSocialAdapter({ env: {}, platform: 'tiktok' });
    const r = a.ready();
    assert.equal(r.ok, false);
    assert.deepEqual(r.missing, MAKE_REQUIRED_ENV);
  });

  it('publish posts JSON to webhook', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oad-make-'));
    const video = path.join(dir, 'v.mp4');
    fs.writeFileSync(video, Buffer.alloc(16));
    let seen;
    const a = createMakeSocialAdapter({
      env: { MAKE_OPSAFTERDARK_WEBHOOK_URL: 'https://hook.example/test' },
      platform: 'tiktok',
      toLocalPathFn: (p) => p,
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
    assert.equal(seen.init.method, 'POST');
    const body = JSON.parse(seen.init.body);
    assert.equal(body.platform, 'tiktok');
    assert.equal(body.entry_id, 'e1');
    assert.equal(body.vertical.bytes, 16);
    assert.equal(r.id, 'ex1');
    assert.equal(r.note, 'handed_off_to_make');
  });
});
