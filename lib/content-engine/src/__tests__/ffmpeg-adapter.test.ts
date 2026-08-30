import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  animateStill,
  burnSubtitles,
  concat,
  escapeDrawtext,
  generateColorField,
  generatePlaceholderStill,
  generateSilence,
  generateThumbnail,
  isFfmpegAvailable,
  isFfprobeAvailable,
  mixAudio,
  probe,
} from '../render/ffmpeg-adapter.js';
import { buildMotionFilter } from '../render/motion.js';

describe('escapeDrawtext', () => {
  it('backslash-escapes colons, quotes, percent, and backslashes for filtergraph safety', () => {
    expect(escapeDrawtext(`it's: 100%\\done`)).toBe(`it\\'s\\: 100\\%\\\\done`);
  });

  it('leaves plain text untouched', () => {
    expect(escapeDrawtext('Todo empezó con una pregunta')).toBe('Todo empezó con una pregunta');
  });

  it('a caption cannot break out of the drawtext text= parameter', () => {
    // A caption that tries to inject a second filter param via colon+equals.
    const malicious = `x':fontsize=999:x='0`;
    const escaped = escapeDrawtext(malicious);
    expect(escaped).not.toContain(`':fontsize`);
  });
});

describe('buildMotionFilter', () => {
  const opts = { width: 1080, height: 1920, fps: 30, durationSec: 2 };

  it('builds a zoompan filter for every motion type', () => {
    for (const motion of ['zoom-in', 'zoom-out', 'pan-left', 'pan-right', 'static'] as const) {
      const filter = buildMotionFilter(motion, opts);
      expect(filter).toMatch(/^zoompan=/);
      expect(filter).toContain('s=1080x1920');
      expect(filter).toContain('fps=30');
    }
  });

  it('computes frame count from duration * fps', () => {
    const filter = buildMotionFilter('static', { ...opts, durationSec: 3 });
    expect(filter).toContain('d=90');
  });
});

const ffmpegAvailable = isFfmpegAvailable();
const ffprobeAvailable = isFfprobeAvailable();

describe.skipIf(!ffmpegAvailable || !ffprobeAvailable)('ffmpeg smoke test (real binary)', () => {
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'content-engine-ffmpeg-smoke-'));
  });

  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('generates a real still image and animates it into a synthetic 2s video, verified via ffprobe', async () => {
    const stillPath = join(dir, 'still.png');
    await generatePlaceholderStill(stillPath, {
      width: 320,
      height: 568,
      backgroundColor: '#5A2CA0',
      text: 'SMOKE TEST',
      fontSize: 24,
      fontColor: '#FFFFFF',
    });

    const videoPath = join(dir, 'clip.mp4');
    const motionFilter = buildMotionFilter('zoom-in', { width: 320, height: 568, fps: 24, durationSec: 2 });
    await animateStill(stillPath, videoPath, { width: 320, height: 568, fps: 24, durationSec: 2, motionFilter });

    const result = await probe(videoPath);
    expect(result.width).toBe(320);
    expect(result.height).toBe(568);
    expect(result.codec).toBe('h264');
    expect(result.durationSec).toBeGreaterThan(1.5);
    expect(result.durationSec).toBeLessThan(2.5);
  }, 30_000);

  it('concatenates two clips end to end and the result duration is the sum', async () => {
    const clipA = join(dir, 'a.mp4');
    const clipB = join(dir, 'b.mp4');
    await generateColorField(join(dir, 'a.png'), { width: 100, height: 100, color: 'red', durationSec: 1 });
    await generateColorField(join(dir, 'b.png'), { width: 100, height: 100, color: 'blue', durationSec: 1 });
    const motionFilter = buildMotionFilter('static', { width: 100, height: 100, fps: 24, durationSec: 1 });
    await animateStill(join(dir, 'a.png'), clipA, { width: 100, height: 100, fps: 24, durationSec: 1, motionFilter });
    await animateStill(join(dir, 'b.png'), clipB, { width: 100, height: 100, fps: 24, durationSec: 1, motionFilter });

    const outputPath = join(dir, 'concat.mp4');
    await concat([clipA, clipB], outputPath);

    const result = await probe(outputPath);
    expect(result.durationSec).toBeGreaterThan(1.8);
    expect(result.durationSec).toBeLessThan(2.2);
  }, 30_000);

  it('mixes a silent video with a generated audio track and produces audio+video output', async () => {
    const stillPath = join(dir, 'still.png');
    await generatePlaceholderStill(stillPath, {
      width: 100,
      height: 100,
      backgroundColor: 'green',
      text: 'A',
      fontSize: 10,
      fontColor: '#FFFFFF',
    });
    const videoPath = join(dir, 'silent.mp4');
    const motionFilter = buildMotionFilter('static', { width: 100, height: 100, fps: 24, durationSec: 1 });
    await animateStill(stillPath, videoPath, { width: 100, height: 100, fps: 24, durationSec: 1, motionFilter });

    const audioPath = join(dir, 'silence.m4a');
    await generateSilence(audioPath, 1);

    const outputPath = join(dir, 'with-audio.mp4');
    await mixAudio(videoPath, [{ path: audioPath, volumeDb: 0 }], outputPath);

    const result = await probe(outputPath);
    expect(result.hasAudio).toBe(true);
    expect(result.width).toBe(100);
  }, 30_000);

  it('burns subtitles onto a video without erroring and produces a valid output file', async () => {
    const stillPath = join(dir, 'still.png');
    await generatePlaceholderStill(stillPath, {
      width: 100,
      height: 100,
      backgroundColor: 'black',
      text: 'A',
      fontSize: 10,
      fontColor: '#FFFFFF',
    });
    const videoPath = join(dir, 'plain.mp4');
    const motionFilter = buildMotionFilter('static', { width: 100, height: 100, fps: 24, durationSec: 1 });
    await animateStill(stillPath, videoPath, { width: 100, height: 100, fps: 24, durationSec: 1, motionFilter });

    const srtPath = join(dir, 'captions.srt');
    const { writeFileSync } = await import('node:fs');
    writeFileSync(srtPath, '1\n00:00:00,000 --> 00:00:01,000\nHello\n', 'utf8');

    const outputPath = join(dir, 'subbed.mp4');
    await burnSubtitles(videoPath, srtPath, outputPath, {
      fontSize: 24,
      primaryColor: '#FFFFFF',
      outlineColor: '#000000',
      outlineWidth: 2,
      marginV: 20,
    });

    const result = await probe(outputPath);
    expect(result.width).toBe(100);
    expect(result.codec).toBe('h264');
  }, 30_000);

  it('generates a thumbnail frame at a given timestamp', async () => {
    const stillPath = join(dir, 'still.png');
    await generatePlaceholderStill(stillPath, {
      width: 100,
      height: 100,
      backgroundColor: 'yellow',
      text: 'A',
      fontSize: 10,
      fontColor: '#000000',
    });
    const videoPath = join(dir, 'v.mp4');
    const motionFilter = buildMotionFilter('static', { width: 100, height: 100, fps: 24, durationSec: 2 });
    await animateStill(stillPath, videoPath, { width: 100, height: 100, fps: 24, durationSec: 2, motionFilter });

    const thumbPath = join(dir, 'thumb.jpg');
    await generateThumbnail(videoPath, thumbPath, 1);

    const result = await probe(thumbPath);
    expect(result.width).toBe(100);
    expect(result.height).toBe(100);
  }, 30_000);
});

describe.skipIf(ffmpegAvailable)('when ffmpeg is not available', () => {
  it('is a documented limitation of this test environment, not a code path this suite exercises', () => {
    expect(true).toBe(true);
  });
});
