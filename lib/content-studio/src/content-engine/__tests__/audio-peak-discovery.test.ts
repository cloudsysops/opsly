import { describe, expect, it } from 'vitest';
import { parseSilenceDetectOutput } from '../ffmpeg.js';

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
