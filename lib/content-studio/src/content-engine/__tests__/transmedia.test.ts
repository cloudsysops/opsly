import { describe, expect, it } from 'vitest';
import type { ContentProjectEnvelope } from '../types.js';
import { bindTransmediaContext } from '../transmedia.js';

function envelope(): ContentProjectEnvelope {
  return {
    schemaVersion: 2,
    project: {
      id: 'astral-s01e01-awakening',
      tenantId: 'astral-arena',
      channel: 'astral-arena',
      series: 'guardians-of-the-nexus',
      episode: 'astral-s01e01-awakening',
      title: 'The Sisters Awaken',
      slug: 'the-sisters-awaken',
      goal: 'engagement',
      audience: 'family',
      format: 'youtube_short',
      status: 'storyboard',
      preset: 'astral-arena',
      mode: 'original',
      createdAt: '2026-09-12T00:00:00.000Z',
      updatedAt: '2026-09-12T00:00:00.000Z',
    },
    scenes: [],
    assets: [],
    renderJobs: [],
  };
}

describe('bindTransmediaContext', () => {
  it('links story, mission and surfaces without changing content ownership', () => {
    const result = bindTransmediaContext(envelope(), {
      franchiseId: 'astral-arena',
      seasonId: 'season-01-guardians-of-the-nexus',
      chapterId: 'chapter-01-awakening',
      storyEventId: 'story-awakening-sisters',
      missionIds: ['awakening-sisters-001', 'awakening-sisters-001'],
      episodeId: 'astral-s01e01-awakening',
      characterIds: ['arena', 'brissa', 'arena'],
      companionIds: [],
      worldIds: ['crystal-temple'],
      surfaces: ['GAME', 'STORY_EPISODE', 'SHORT', 'GAME'],
      continuity: 'CANON',
      source: 'mixed',
      gameplayBuildSha: 'abcdef1234567890',
      captureMarkers: ['sisters-connect', 'sisters-connect'],
    });

    expect(result.transmedia).toMatchObject({
      franchiseId: 'astral-arena',
      storyEventId: 'story-awakening-sisters',
      missionIds: ['awakening-sisters-001'],
      characterIds: ['arena', 'brissa'],
      surfaces: ['GAME', 'STORY_EPISODE', 'SHORT'],
      captureMarkers: ['sisters-connect'],
    });
    expect(result.project.id).toBe('astral-s01e01-awakening');
  });

  it('fails closed when no distribution surface exists', () => {
    expect(() =>
      bindTransmediaContext(envelope(), {
        franchiseId: 'astral-arena',
        seasonId: 'season-01',
        storyEventId: 'event-1',
        missionIds: [],
        characterIds: [],
        companionIds: [],
        worldIds: [],
        surfaces: [],
        continuity: 'CANON',
        source: 'scripted_story',
      }),
    ).toThrow('TRANSMEDIA_SURFACE_REQUIRED');
  });
});
