import { describe, expect, it } from 'vitest';
import { buildSrt } from '../subtitles/srt.js';
import type { Scene } from '../domain/types.js';

function scene(order: number, durationMs: number, caption?: string): Scene {
  return {
    id: `scene_${order}`,
    projectId: 'p1',
    order,
    durationMs,
    visualType: 'image',
    assetRefs: ['a1'],
    caption,
    transition: 'cut',
    motion: 'static',
  };
}

describe('buildSrt', () => {
  it('produces sequential cues with correct cumulative timestamps', () => {
    const scenes = [scene(1, 5000, 'Hello'), scene(2, 3000, 'World')];
    const srt = buildSrt(scenes);
    expect(srt).toContain('1\n00:00:00,000 --> 00:00:05,000\nHello');
    expect(srt).toContain('2\n00:00:05,000 --> 00:00:08,000\nWorld');
  });

  it('skips scenes without a caption but still advances the timeline', () => {
    const scenes = [scene(1, 2000, 'A'), scene(2, 3000, undefined), scene(3, 1000, 'B')];
    const srt = buildSrt(scenes);
    // Cue 2 (for scene 3) should start at 5000ms (2000+3000), not 2000ms.
    expect(srt).toContain('2\n00:00:05,000 --> 00:00:06,000\nB');
    expect(srt).not.toContain('\n\n\n');
  });

  it('respects scene.order rather than array insertion order', () => {
    const scenes = [scene(2, 1000, 'Second'), scene(1, 1000, 'First')];
    const srt = buildSrt(scenes);
    const firstIndex = srt.indexOf('First');
    const secondIndex = srt.indexOf('Second');
    expect(firstIndex).toBeLessThan(secondIndex);
  });

  it('formats hour-scale timestamps correctly', () => {
    const scenes = [scene(1, 3_661_000, 'Long')];
    const srt = buildSrt(scenes);
    expect(srt).toContain('00:00:00,000 --> 01:01:01,000');
  });

  it('returns an empty string for an empty scene list', () => {
    expect(buildSrt([])).toBe('');
  });
});
