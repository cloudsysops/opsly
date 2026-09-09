import { describe, expect, it } from 'vitest';
import { parseSilenceDetectOutput } from '../ffmpeg.js';
import { computeLoudSegments, discoverClipsFromAudioPeaks } from '../audio-peak-discovery.js';
import { ffmpegAvailable, generateOwnedFixture } from '../ffmpeg.js';
import { mkdtempSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

describe('parseSilenceDetectOutput', () => {
  it('extracts matched silence_start/silence_end pairs', () => {
    const stderr = [
      '[silencedetect @ 0x1] silence_start: 2.5',
      '[silencedetect @ 0x1] silence_end: 4.1 | silence_duration: 1.6',
      '[silencedetect @ 0x1] silence_start: 10.0',
      '[silencedetect @ 0x1] silence_end: 10.8 | silence_duration: 0.8',
    ].join('\n');
    expect(parseSilenceDetectOutput(stderr)).toEqual([
      { start: 2.5, end: 4.1 },
      { start: 10.0, end: 10.8 },
    ]);
  });

  it('returns an empty array when there is no silence logged', () => {
    expect(parseSilenceDetectOutput('no silencedetect lines here')).toEqual([]);
  });
});

describe('computeLoudSegments', () => {
  it('treats the whole clip as one loud segment when there is no silence', () => {
    expect(computeLoudSegments(10, [])).toEqual([{ start: 0, end: 10 }]);
  });

  it('splits around a silence gap', () => {
    expect(computeLoudSegments(20, [{ start: 8, end: 12 }])).toEqual([
      { start: 0, end: 8 },
      { start: 12, end: 20 },
    ]);
  });

  it('drops segments shorter than minSec', () => {
    expect(computeLoudSegments(20, [{ start: 1, end: 19 }], { minSec: 3 })).toEqual([]);
  });

  it('caps segments longer than maxSec', () => {
    expect(computeLoudSegments(100, [], { maxSec: 30 })).toEqual([{ start: 0, end: 30 }]);
  });
});

describe.skipIf(!ffmpegAvailable())('discoverClipsFromAudioPeaks', () => {
  it('throws AUDIO_PEAK_DISCOVERY_FAILED for a nonexistent file', async () => {
    await expect(discoverClipsFromAudioPeaks('/nonexistent/path.wav')).rejects.toThrow(
      /AUDIO_PEAK_DISCOVERY_FAILED/
    );
  });

  it('returns at least one candidate for a generated fixture with sound throughout', async () => {
    const baseDir = mkdtempSync(path.join(os.tmpdir(), 'audio-peaks-'));
    const fixture = path.join(baseDir, 'fixture.mp4');
    await generateOwnedFixture(fixture, 6);
    const clips = await discoverClipsFromAudioPeaks(fixture, { minSec: 1 });
    expect(clips.length).toBeGreaterThan(0);
    expect(clips[0].category).toBe('audio_peak');
    expect(clips[0].end).toBeGreaterThan(clips[0].start);
  });
});
