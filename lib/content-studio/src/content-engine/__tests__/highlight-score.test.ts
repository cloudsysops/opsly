import { describe, expect, it } from 'vitest';
import { selectPrimaryCandidates, scoreGameplayCandidate } from '../highlight-score.js';
import type { ClipCandidate } from '../types.js';

function clip(overrides: Partial<ClipCandidate>): ClipCandidate {
  return {
    id: 'c1',
    start: 0,
    end: 12,
    duration: 12,
    transcript: '',
    hook: 'Gameplay highlight',
    category: 'audio_peak',
    score: 48,
    reasons: ['sustained_audio_activity'],
    ...overrides,
  };
}

describe('scoreGameplayCandidate', () => {
  it('stores a breakdown and does not invent gameplay facts', () => {
    const scored = scoreGameplayCandidate(clip({}));
    expect(scored.scoreBreakdown?.ENTERTAINMENT).toBeGreaterThan(0);
    expect(scored.dragonMode).toBe('NONE');
    expect(scored.recommendedFormats).toContain('youtube_short');
    expect(scored.hook).toBe('Gameplay highlight');
  });
});

describe('selectPrimaryCandidates', () => {
  it('prefers quality over forcing five clips', () => {
    const selected = selectPrimaryCandidates([
      clip({ id: 'good', duration: 12, end: 12 }),
      clip({ id: 'short', duration: 2, end: 2, start: 20 }),
    ]);
    expect(selected.primary.length).toBeGreaterThanOrEqual(1);
    expect(selected.primary.length).toBeLessThanOrEqual(5);
    expect(selected.primary[0]?.id).toBe('good');
  });

  it('ranks overflow instead of dropping extra strong clips silently', () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      clip({ id: `c${index}`, start: index * 10, end: index * 10 + 12, duration: 12 }),
    );
    const selected = selectPrimaryCandidates(many);
    expect(selected.primary).toHaveLength(5);
    expect(selected.overflow).toHaveLength(3);
  });
});
