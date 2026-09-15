import { describe, expect, it } from 'vitest';
import { decideReview, scoreFromFindings } from '../review-policy.js';
import type { ContentProjectEnvelope, ReviewFinding, RightsManifest } from '../types.js';

function envelope(): ContentProjectEnvelope {
  return {
    schemaVersion: 2,
    project: {
      id: 'p1',
      tenantId: 'icso-gaming-tbd',
      channel: 'icso-gaming-tbd',
      series: 'demo',
      episode: '1',
      title: 'Clip',
      slug: 'clip',
      goal: 'engagement',
      audience: 'general',
      format: 'youtube_short',
      status: 'qa',
      preset: 'icso-gaming-tbd',
      mode: 'original',
      createdAt: '2026-09-09T00:00:00.000Z',
      updatedAt: '2026-09-09T00:00:00.000Z',
    },
    scenes: [],
    assets: [],
    renderJobs: [],
    metadata: { title: 'Clip', description: 'Gameplay', tags: ['gameplay'], privacyStatus: 'unlisted' },
    clipCandidates: [{ id: 'c1', start: 0, end: 8, duration: 8, transcript: '', hook: 'Gameplay highlight', category: 'peak', score: 40, reasons: [] }],
  };
}

const owned: RightsManifest = {
  GAMEPLAY_RIGHTS: 'OWNED',
  MUSIC_RIGHTS: 'UNKNOWN',
  ASSET_RIGHTS: 'OWNED',
  DRAGON_ASSETS: 'NONE',
  THUMBNAIL_ASSETS: 'OWNED',
  publishReady: false,
};

describe('decideReview', () => {
  it('lets rights blockers override a high score', () => {
    const score = scoreFromFindings(envelope(), [], owned);
    expect(decideReview({ findings: [], rightsBlocked: true, score })).toBe('BLOCKED');
  });

  it('requests changes for important repairable findings', () => {
    const findings: ReviewFinding[] = [
      {
        finding_id: 'black-0',
        severity: 'IMPORTANT',
        timecode_start: 0,
        timecode_end: 2,
        category: 'VIDEO',
        issue: 'Leading black frames',
        recommended_fix: 'Trim from 2s',
        evidence: 'blackdetect',
        repairable: true,
      },
    ];
    const score = scoreFromFindings(envelope(), findings, owned);
    expect(decideReview({ findings, rightsBlocked: false, score })).toBe('REQUEST_CHANGES');
  });

  it('approves a clean scorecard', () => {
    const score = scoreFromFindings(envelope(), [], owned);
    expect(score.total).toBeGreaterThanOrEqual(70);
    expect(decideReview({ findings: [], rightsBlocked: false, score })).toBe('APPROVED');
  });
});
