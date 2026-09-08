import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyBrandKit, loadBrandKit } from '../content-studio-brand-kit.mjs';
import { loadChannelBrandPayload, summarizeBrandDryRun } from '../content-studio-youtube-brand.mjs';

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

test('clicksitos gaming batch parses and is not kids', () => {
  const clicksitos = batchIds('clicksitos');
  assert.ok(clicksitos.length >= 10, `expected Clicksitos drafts, got ${clicksitos.length}`);
  assert.equal(new Set(clicksitos).size, clicksitos.length, 'duplicate Clicksitos draft ids');

  const channels = loadJson('config/content-studio/youtube-channels.json');
  assert.equal(channels.channels.clicksitos.batch_dir, 'config/content-studio/channels/clicksitos');
  assert.equal(channels.channels.clicksitos.category_id, '20');
  assert.equal(channels.channels.clicksitos.made_for_kids, false);
  assert.match(channels.channels.clicksitos.youtube_channel_id, /^UC/);
});

test('opsly company channel is the live OAuth @opsly surface', () => {
  const opsly = batchIds('opsly');
  assert.ok(opsly.length >= 8, `expected Opsly drafts, got ${opsly.length}`);
  assert.equal(new Set(opsly).size, opsly.length, 'duplicate Opsly draft ids');

  const channels = loadJson('config/content-studio/youtube-channels.json');
  assert.equal(channels.channels.opsly.handle, '@opsly');
  assert.equal(channels.channels.opsly.youtube_channel_id, 'UCuC5_xc2M3muQzuPR2rrhwA');
  assert.equal(channels.channels.opsly.category_id, '28');
  assert.equal(channels.channels.opsly.made_for_kids, false);
  assert.ok(existsSync(join(root, channels.channels.opsly.batch_dir)));
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
  const clicksitos = new Set(batchIds('clicksitos'));
  const opsly = new Set(batchIds('opsly'));
  for (const id of plan.channels.bitsitos.publish_order_today) {
    assert.ok(bitsitos.has(id), `publish plan bitsitos id missing from batches: ${id}`);
  }
  for (const id of plan.channels.splashitos.publish_order_today) {
    assert.ok(splashitos.has(id), `publish plan splashitos id missing from batches: ${id}`);
  }
  for (const id of plan.channels.clicksitos.publish_order_today) {
    assert.ok(clicksitos.has(id), `publish plan clicksitos id missing from batches: ${id}`);
  }
  for (const id of plan.channels.opsly.publish_order_today) {
    assert.ok(opsly.has(id), `publish plan opsly id missing from batches: ${id}`);
  }
});

test('youtube-channels.json points at existing batch dirs', () => {
  const channels = loadJson('config/content-studio/youtube-channels.json');
  assert.equal(channels.not_peskids, true);
  assert.ok(existsSync(join(root, channels.channels.bitsitos.batch_dir)));
  assert.ok(existsSync(join(root, channels.channels.splashitos.batch_dir)));
  assert.ok(existsSync(join(root, channels.channels.clicksitos.batch_dir)));
  assert.match(channels.channels.bitsitos.youtube_channel_id, /^UC/);
});

test('overnight backlog auto-tasks are gamer-safe kinds', () => {
  const backlog = loadJson('config/overnight-backlog.json');
  assert.ok(Array.isArray(backlog.tasks));
  const kinds = new Set(backlog.tasks.map((t) => t.kind));
  assert.ok(kinds.has('content_video'));
  for (const t of backlog.tasks) {
    if (t.kind === 'content_video') {
      assert.ok(['bitsitos', 'splashitos', 'clicksitos', 'opsly', 'opsly-universe'].includes(t.channel), t.id);
      assert.ok(['light', 'heavy'].includes(t.min_mode), t.id);
    }
  }
  const ids = backlog.tasks.map((t) => t.id);
  assert.ok(ids.includes('canvas-content-studio-bitsitos'));
  assert.ok(ids.includes('canvas-content-studio-opsly'));
  assert.ok(ids.includes('canvas-content-studio-clicksitos'));
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

test('opsly youtube brand payload has avatar banner and about', () => {
  const payload = loadChannelBrandPayload(root, 'opsly');
  const summary = summarizeBrandDryRun(payload);
  assert.equal(payload.title, 'Opsly');
  assert.equal(payload.youtubeChannelId, 'UCuC5_xc2M3muQzuPR2rrhwA');
  assert.ok(existsSync(payload.avatar), payload.avatar);
  assert.ok(existsSync(payload.banner), payload.banner);
  assert.match(payload.description, /No es Peskids/);
  assert.equal(summary.avatarApi, 'unsupported — Studio only');
});

test('applyBrandKit prefixes opsly prompts once and attaches refs', () => {
  const kit = loadBrandKit(root);
  const first = applyBrandKit(kit, 'opsly', 'Illustrated vault, subtitle SECRETOS');
  assert.match(first.image_prompt, /ICSO Opsly brand/);
  assert.match(first.image_prompt, /SECRETOS/);
  assert.ok(first.visual_refs.includes('docs/brand/icso/youtube/opsly-avatar.png'));
  const second = applyBrandKit(kit, 'opsly', first.image_prompt);
  assert.equal(second.image_prompt, first.image_prompt);
});

test('brand kit splits @opsly studio art from Universe boards', () => {
  const kit = loadJson('config/content-studio/brand-kit.json');
  const channels = loadJson('config/content-studio/youtube-channels.json');
  assert.equal(channels.brand_kit, 'config/content-studio/brand-kit.json');
  assert.ok(existsSync(join(root, kit.channels.opsly.studio.avatar)));
  assert.ok(existsSync(join(root, kit.channels.opsly.studio.banner)));
  for (const rel of kit.channels['opsly-universe'].reference_images) {
    assert.ok(existsSync(join(root, rel)), rel);
    assert.ok(!kit.channels.opsly.reference_images.includes(rel), `universe board leaked into @opsly refs: ${rel}`);
  }
  for (const forbidden of kit.channels.opsly.do_not_use_as_avatar) {
    assert.ok(kit.channels['opsly-universe'].reference_images.includes(forbidden), forbidden);
  }
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
