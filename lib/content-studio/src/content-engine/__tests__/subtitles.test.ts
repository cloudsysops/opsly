import { describe, expect, it } from 'vitest';
import { buildSrt, buildSubtitleCuesFromScenes, formatSrtTimestamp } from '../subtitles.js';

describe('content-engine subtitles', () => {
  it('formats srt timestamps', () => {
    expect(formatSrtTimestamp(0)).toBe('00:00:00,000');
    expect(formatSrtTimestamp(61_234)).toBe('00:01:01,234');
  });

  it('builds cues from scenes in order', () => {
    const cues = buildSubtitleCuesFromScenes([
      {
        id: 'scene-2',
        projectId: 'project',
        order: 2,
        durationMs: 1500,
        visualType: 'image',
        assetRefs: ['asset-2'],
        caption: 'Second',
        transition: 'cut',
        motion: 'static',
      },
      {
        id: 'scene-1',
        projectId: 'project',
        order: 1,
        durationMs: 2000,
        visualType: 'image',
        assetRefs: ['asset-1'],
        caption: 'First',
        transition: 'cut',
        motion: 'zoom-in',
      },
    ]);

    expect(cues).toHaveLength(2);
    expect(cues[0].startMs).toBe(0);
    expect(cues[0].endMs).toBe(2000);
    expect(cues[1].startMs).toBe(2000);
  });

  it('builds srt text', () => {
    const srt = buildSrt([
      { index: 1, startMs: 0, endMs: 1000, text: 'Hello' },
      { index: 2, startMs: 1000, endMs: 2500, text: 'World' },
    ]);

    expect(srt).toContain('1');
    expect(srt).toContain('00:00:00,000 --> 00:00:01,000');
    expect(srt).toContain('World');
  });
});
