import { describe, expect, it } from 'vitest';
import { enqueueApprovedPublishJob } from '../publishing.js';
import type { ContentProjectEnvelope } from '../types.js';

function envelope(state: 'ready_for_review' | 'approved' | 'rejected'): ContentProjectEnvelope {
  return {
    schemaVersion: 2,
    project: {
      id: 'pub-demo',
      tenantId: 'icso-gaming-tbd',
      channel: 'icso-gaming-tbd',
      series: 'demo',
      episode: '1',
      title: 'Publish Demo',
      slug: 'publish-demo',
      goal: 'engagement',
      audience: 'general',
      format: 'youtube_short',
      status: state === 'approved' ? 'approved' : 'human_review',
      preset: 'icso-gaming-tbd',
      mode: 'original',
      createdAt: '2026-09-09T00:00:00.000Z',
      updatedAt: '2026-09-09T00:00:00.000Z',
    },
    scenes: [],
    assets: [],
    renderJobs: [],
    approval: { state },
  };
}

describe('enqueueApprovedPublishJob', () => {
  it('records a queued job only after human approval', () => {
    const next = enqueueApprovedPublishJob(envelope('approved'));
    expect(next.publishJobs).toHaveLength(1);
    expect(next.publishJobs?.[0]?.status).toBe('queued');
    expect(next.publishJobs?.[0]?.platform).toBe('youtube');
  });

  it('blocks enqueue without approval', () => {
    expect(() => enqueueApprovedPublishJob(envelope('ready_for_review'))).toThrow(/BLOCKED_PUBLISH/);
  });

  it('blocks auto-publish even after approval', () => {
    const previous = process.env.OPSLY_CONTENT_AUTO_PUBLISH;
    process.env.OPSLY_CONTENT_AUTO_PUBLISH = 'true';
    try {
      expect(() => enqueueApprovedPublishJob(envelope('approved'))).toThrow(/BLOCKED_AUTO_PUBLISH/);
    } finally {
      if (previous === undefined) {
        delete process.env.OPSLY_CONTENT_AUTO_PUBLISH;
      } else {
        process.env.OPSLY_CONTENT_AUTO_PUBLISH = previous;
      }
    }
  });
});
