import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createYouTubeShortsAdapter, REQUIRED_ENV } from '../youtube-bridge.mjs';

const ENV = { YOUTUBE_CLIENT_ID: 'cid', YOUTUBE_CLIENT_SECRET: 'csecret', YOUTUBE_OPSAFTERDARK_REFRESH_TOKEN: 'oad-refresh' };
const ENTRY = { id: 's-01', vertical: 'D:\\Content\\PostStream\\x\\a.mp4', caption: 'Clip del directo de OpsAfterDark 🎮 Live: twitch.tv/opsafterdark #gaming #twitch' };

function fakeClass() {
  const seen = { creds: null, requests: [] };
  class FakePublisher {
    constructor(creds) { seen.creds = creds; }
    async publish(req) { seen.requests.push(req); return { video_id: 'abc123', url: 'https://youtube.com/shorts/abc123', uploaded_at: 'now' }; }
  }
  return { FakePublisher, seen };
}

test('never falls back to the Opsly channel token', () => {
  const { FakePublisher } = fakeClass();
  // Solo el token del canal Opsly: NO es suficiente.
  const a = createYouTubeShortsAdapter({ env: { YOUTUBE_CLIENT_ID: 'c', YOUTUBE_CLIENT_SECRET: 's', YOUTUBE_REFRESH_TOKEN: 'opsly-token' }, YouTubePublisher: FakePublisher });
  assert.deepEqual(a.ready(), { ok: false, missing: ['YOUTUBE_OPSAFTERDARK_REFRESH_TOKEN'] });
  assert.ok(!REQUIRED_ENV.includes('YOUTUBE_REFRESH_TOKEN'));
});

test('ready when the OpsAfterDark channel credentials exist', () => {
  const { FakePublisher } = fakeClass();
  assert.deepEqual(createYouTubeShortsAdapter({ env: ENV, YouTubePublisher: FakePublisher }).ready(), { ok: true });
});

test('publishes with the OpsAfterDark token and safe defaults', async () => {
  const { FakePublisher, seen } = fakeClass();
  const a = createYouTubeShortsAdapter({ env: { ...ENV, YOUTUBE_REFRESH_TOKEN: 'opsly-token' }, YouTubePublisher: FakePublisher, toLocalPath: (p) => p.replace(/^D:\\/, '/mnt/d/').replace(/\\/g, '/') });
  const r = await a.publish(ENTRY);
  assert.deepEqual(r, { id: 'abc123', url: 'https://youtube.com/shorts/abc123', privacy: 'private' });
  assert.equal(seen.creds.refresh_token, 'oad-refresh', 'token del canal OpsAfterDark, no el de Opsly');
  const req = seen.requests[0];
  assert.equal(req.file_path, '/mnt/d/Content/PostStream/x/a.mp4');
  assert.equal(req.title, 'Clip del directo de OpsAfterDark 🎮 #shorts');
  assert.equal(req.privacy_status, 'private', 'privado por defecto');
  assert.equal(req.made_for_kids, false);
  assert.equal(req.category_id, '20');
  assert.deepEqual(req.tags, ['shorts', 'gaming', 'twitch']);
});

test('privacy only accepts known values', async () => {
  const { FakePublisher, seen } = fakeClass();
  await createYouTubeShortsAdapter({ env: { ...ENV, YOUTUBE_OPSAFTERDARK_PRIVACY: 'public' }, YouTubePublisher: FakePublisher }).publish(ENTRY);
  assert.equal(seen.requests[0].privacy_status, 'public');
  await createYouTubeShortsAdapter({ env: { ...ENV, YOUTUBE_OPSAFTERDARK_PRIVACY: 'todo-publico' }, YouTubePublisher: FakePublisher }).publish(ENTRY);
  assert.equal(seen.requests[1].privacy_status, 'private');
});

test('rejects entries without a vertical file and requires the publisher class', async () => {
  const { FakePublisher } = fakeClass();
  await assert.rejects(createYouTubeShortsAdapter({ env: ENV, YouTubePublisher: FakePublisher }).publish({ id: 'x' }), /vertical/);
  assert.throws(() => createYouTubeShortsAdapter({ env: ENV }), /YouTubePublisher/);
});
