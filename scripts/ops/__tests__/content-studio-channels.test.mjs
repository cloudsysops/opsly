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
