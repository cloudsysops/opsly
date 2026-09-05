import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');

function loadJson(rel) {
  return JSON.parse(readFileSync(join(root, rel), 'utf8'));
}

function batchIds(channel) {
  const dir = join(root, 'config/content-studio/channels', channel);
  return readdirSync(dir)
    .filter((f) => f.startsWith('batch-') && f.endsWith('.json'))
    .sort()
    .flatMap((f) => {
      const batch = JSON.parse(readFileSync(join(dir, f), 'utf8'));
      return (batch.drafts || []).map((d) => d.id);
    });
}

test('bitsitos and splashitos batches parse and have unique draft ids', () => {
  const bitsitos = batchIds('bitsitos');
  const splashitos = batchIds('splashitos');
  assert.ok(bitsitos.length >= 7, `expected Bitsitos drafts, got ${bitsitos.length}`);
  assert.ok(splashitos.length >= 10, `expected Splashitos drafts, got ${splashitos.length}`);
  assert.equal(new Set(bitsitos).size, bitsitos.length, 'duplicate Bitsitos draft ids');
  assert.equal(new Set(splashitos).size, splashitos.length, 'duplicate Splashitos draft ids');
});

test('opsly universe batch is wired for PC-gamer rendering', () => {
  const universe = batchIds('opsly-universe');
  assert.ok(universe.length >= 4, `expected universe drafts, got ${universe.length}`);
  assert.equal(new Set(universe).size, universe.length, 'duplicate Universe draft ids');

  const channels = loadJson('config/content-studio/youtube-channels.json');
  assert.equal(channels.channels['opsly-universe'].batch_dir, 'config/content-studio/channels/opsly-universe');
  assert.equal(channels.channels['opsly-universe'].approval_required, true);
});

test('youtube publish plan ids exist in channel batches', () => {
  const plan = loadJson('config/content-studio/youtube-publish-plan.json');
  const bitsitos = new Set(batchIds('bitsitos'));
  const splashitos = new Set(batchIds('splashitos'));
  for (const id of plan.channels.bitsitos.publish_order_today) {
    assert.ok(bitsitos.has(id), `publish plan bitsitos id missing from batches: ${id}`);
  }
  for (const id of plan.channels.splashitos.publish_order_today) {
    assert.ok(splashitos.has(id), `publish plan splashitos id missing from batches: ${id}`);
  }
});

test('youtube-channels.json points at existing batch dirs', () => {
  const channels = loadJson('config/content-studio/youtube-channels.json');
  assert.equal(channels.not_peskids, true);
  assert.ok(existsSync(join(root, channels.channels.bitsitos.batch_dir)));
  assert.ok(existsSync(join(root, channels.channels.splashitos.batch_dir)));
  assert.match(channels.channels.bitsitos.youtube_channel_id, /^UC/);
});

test('overnight backlog auto-tasks are gamer-safe kinds', () => {
  const backlog = loadJson('config/overnight-backlog.json');
  assert.ok(Array.isArray(backlog.tasks));
  const kinds = new Set(backlog.tasks.map((t) => t.kind));
  assert.ok(kinds.has('content_video'));
  for (const t of backlog.tasks) {
    if (t.kind === 'content_video') {
      assert.ok(['bitsitos', 'splashitos', 'opsly-universe'].includes(t.channel), t.id);
      assert.ok(['light', 'heavy'].includes(t.min_mode), t.id);
    }
  }
  const ids = backlog.tasks.map((t) => t.id);
  assert.ok(ids.includes('canvas-content-studio-bitsitos'));
  assert.ok(ids.includes('canvas-content-studio-opsly-universe'));
  assert.ok(existsSync(join(root, 'scripts/ops/pc-gamer-watch.sh')));
});

test('24x7 factory tick and launchd exist with YouTube quota cadence', () => {
  assert.ok(existsSync(join(root, 'scripts/ops/content-studio-24x7.sh')));
  assert.ok(existsSync(join(root, 'scripts/ops/ensure-content-studio-24x7-launchd.sh')));
  assert.ok(existsSync(join(root, 'infra/launchd/com.opsly.content-studio-24x7.plist')));
  const plan = loadJson('config/content-studio/youtube-publish-plan.json');
  assert.match(String(plan.cadence_note || ''), /6 uploads/);
  const agents = loadJson('config/content-studio/content-agents.json');
  assert.match(agents.constraints.publish, /24x7/);
  const plist = readFileSync(
    join(root, 'infra/launchd/com.opsly.content-studio-24x7.plist'),
    'utf8'
  );
  assert.match(plist, /content-studio-24x7\.sh/);
  assert.match(plist, /<integer>900<\/integer>/);
});

test('content studio renders only on pc-gamer and schedule allows content_video', () => {
  const agents = loadJson('config/content-studio/content-agents.json');
  assert.deepEqual(agents.constraints.render_hosts, ['pc-gamer']);
  assert.equal(agents.queues['content-video'].mpt_base_url, 'http://127.0.0.1:8080');
  assert.ok(!agents.constraints.render_hosts.includes('mac-local'));

  const schedule = loadJson('config/pc-gamer-schedule.json');
  assert.ok(schedule.modes.heavy.allow_enqueue.includes('content_video'));
  assert.ok(schedule.modes.light.allow_enqueue.includes('content_video'));
  assert.ok(schedule.modes.gaming.deny_enqueue.includes('content_video'));
  assert.ok(!schedule.modes.gaming.allow_enqueue.includes('content_video'));
});
