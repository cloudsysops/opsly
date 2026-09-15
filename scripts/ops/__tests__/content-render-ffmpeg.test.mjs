import assert from 'node:assert/strict';
import { mkdtemp, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  FfmpegNotAvailableError,
  buildTitleCardArgs,
  escapeDrawtext,
  isFfmpegAvailable,
  renderTitleCard,
  resolveCanvas,
} from '../content-render-ffmpeg.mjs';

describe('content-render-ffmpeg', () => {
  it('escapes drawtext control characters', () => {
    assert.equal(escapeDrawtext(`a:b'c\\d%e`), `a\\:b\\'c\\\\d\\%e`);
  });

  it('maps aspect ratios to Shorts and landscape canvases', () => {
    assert.deepEqual(resolveCanvas('9:16'), { width: 1080, height: 1920 });
    assert.deepEqual(resolveCanvas('16:9'), { width: 1920, height: 1080 });
  });

  it('builds an argv array without a shell', () => {
    const plan = buildTitleCardArgs({
      title: 'Hello: world',
      aspectRatio: '9:16',
      durationSec: 6,
      videoPath: '/tmp/out.mp4',
      thumbPath: '/tmp/out.jpg',
    });
    assert.equal(plan.duration, 6);
    assert.ok(!plan.videoArgs.includes('sh'));
    assert.ok(plan.videoArgs.includes('libx264'));
    assert.equal(plan.usedDrawtext, true);
    assert.ok(plan.videoArgs.some((arg) => String(arg).includes('Hello\\: world')));
    assert.equal(plan.thumbArgs.at(-1), '/tmp/out.jpg');
    const fallback = buildTitleCardArgs({
      title: 'Hello',
      videoPath: '/tmp/out.mp4',
      thumbPath: '/tmp/out.jpg',
      useDrawtext: false,
    });
    assert.equal(fallback.usedDrawtext, false);
    assert.ok(!fallback.videoArgs.some((arg) => String(arg).includes('drawtext')));
  });

  it('fails closed when ffmpeg is missing', async () => {
    if (isFfmpegAvailable()) {
      assert.equal(isFfmpegAvailable(), true);
      return;
    }
    await assert.rejects(
      () =>
        renderTitleCard({
          title: 'x',
          videoPath: '/tmp/missing.mp4',
          thumbPath: '/tmp/missing.jpg',
        }),
      FfmpegNotAvailableError,
    );
  });

  it('renders a real MP4 when ffmpeg is installed', async (t) => {
    if (!isFfmpegAvailable()) {
      t.skip('ffmpeg not installed in this environment');
      return;
    }
    const dir = await mkdtemp(join(tmpdir(), 'opsly-ffmpeg-'));
    const videoPath = join(dir, 'final.mp4');
    const thumbPath = join(dir, 'thumbnail.jpg');
    await renderTitleCard({
      title: 'Opsly GPU worker',
      aspectRatio: '9:16',
      durationSec: 3,
      videoPath,
      thumbPath,
    });
    const video = await stat(videoPath);
    const thumb = await stat(thumbPath);
    assert.ok(video.size > 1000, `expected real mp4, got ${video.size} bytes`);
    assert.ok(thumb.size > 200, `expected thumbnail, got ${thumb.size} bytes`);
  });
});
