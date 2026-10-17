import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runPublisher } from '../publisher.mjs';

describe('publisher Make handoff', () => {
  it('records delivered_to_make, marks entry delivered (not published, not re-selected)', async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'oad-pub-'));
    const video = path.join(dir, 'v.mp4');
    fs.writeFileSync(video, Buffer.alloc(8));
    const queueFile = path.join(dir, 'q.json');
    const nowMs = Date.parse('2026-10-17T23:30:00Z');
    const entry = {
      id: 'e-make',
      status: 'approved',
      scheduledAt: '2026-10-17T19:00',
      timezone: 'America/New_York',
      vertical: video,
      platforms: ['tiktok', 'instagram_reels'],
      caption: 'test',
      approvedAt: '2026-10-17T12:00:00Z',
      approvedBy: 'operator',
    };
    fs.writeFileSync(queueFile, JSON.stringify([entry], null, 2));

    const adapters = {
      tiktok: {
        name: 'tiktok',
        ready: () => ({ ok: true }),
        publish: async () => ({ state: 'delivered_to_make', id: 'm1', note: 'delivered_to_make' }),
      },
      instagram_reels: {
        name: 'instagram_reels',
        ready: () => ({ ok: true }),
        publish: async () => ({ state: 'delivered_to_make', id: 'm2', note: 'delivered_to_make' }),
      },
    };

    const res = await runPublisher({ queueFile, adapters, nowMs, exists: () => true, log: () => {} });
    assert.equal(res.action, 'ran');
    assert.equal(res.status, 'delivered');
    const q = JSON.parse(fs.readFileSync(queueFile, 'utf8'));
    assert.equal(q[0].status, 'delivered');
    assert.equal(q[0].platformStatus.tiktok.state, 'delivered_to_make');
    assert.equal(q[0].platformStatus.instagram_reels.state, 'delivered_to_make');
    assert.equal(q[0].publishedAt, undefined);
    assert.ok(q[0].deliveredAt);
    const again = await runPublisher({ queueFile, adapters, nowMs: nowMs + 3600_000, exists: () => true, log: () => {} });
    assert.notEqual(again.action, 'ran', 'una entrega a Make no se reintenta ni bloquea la cola');
  });
});
