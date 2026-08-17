import { describe, it, expect } from 'vitest';
import { checkEpisodeCompliance } from '../EpisodeManager.js';
import { buildEpisodeRenderPlan } from '../../rendering/episode-render-plan.js';
import type { Episode } from '../../types.js';

function makeEpisode(overrides: Partial<Episode> = {}): Episode {
  return {
    id: 'opsly-origins-001',
    series_id: 'opsly-origins',
    episode_number: 1,
    title: { es: 'Todo empezó hablando con una IA', en: 'It all started by talking to an AI' },
    hook: { es: '2025. Una laptop, muchas ideas.', en: '2025. A laptop, big ideas.' },
    objective: 'Establish the origin story',
    audience: ['founders', 'developers'],
    duration_estimate_sec: 60,
    scenes: [
      {
        number: 1,
        description: 'Founder alone, thinking',
        visuals: 'Mac, nighttime, soft glow',
        copy: '2025. Una laptop, muchas ideas.',
        duration_sec: 10,
        assets_needed: ['character sheet: opsly-founder'],
      },
    ],
    metadata: {
      call_to_action: 'Subscribe for the journey',
      captions: { es: 'Así comenzó todo.', en: "This is how it started." },
      hashtags: ['#Opsly'],
      thumbnail_concept: 'Founder silhouette against digital city',
    },
    production: {
      status: 'script',
      created_at: '2026-08-01T00:00:00Z',
      last_updated: '2026-08-01T00:00:00Z',
      published_platforms: [],
      publish_urls: {},
      notes: [],
    },
    ...overrides,
  };
}

describe('checkEpisodeCompliance', () => {
  it('passes for clean episode content', () => {
    const result = checkEpisodeCompliance(makeEpisode());
    expect(result.isCompliant).toBe(true);
  });

  it('flags a secret leaked into scene copy', () => {
    const episode = makeEpisode({
      scenes: [
        {
          number: 1,
          description: 'oops',
          visuals: 'oops',
          copy: 'Our key is AKIAIOSFODNN7EXAMPLE',
          duration_sec: 5,
          assets_needed: [],
        },
      ],
    });
    const result = checkEpisodeCompliance(episode);
    expect(result.isCompliant).toBe(false);
  });
});

describe('buildEpisodeRenderPlan', () => {
  it('marks an idea-stage episode as not ready to render', () => {
    const episode = makeEpisode({ scenes: [], production: { ...makeEpisode().production, status: 'idea' } });
    const plan = buildEpisodeRenderPlan(episode);
    expect(plan.ready_to_render).toBe(false);
    expect(plan.blocking_reasons.length).toBeGreaterThan(0);
  });

  it('marks a storyboard-stage episode with scenes as ready to render', () => {
    const episode = makeEpisode({ production: { ...makeEpisode().production, status: 'storyboard' } });
    const plan = buildEpisodeRenderPlan(episode);
    expect(plan.ready_to_render).toBe(true);
    expect(plan.total_duration_sec).toBe(10);
    expect(plan.assets_required).toContain('character sheet: opsly-founder');
  });

  it('never calls a render provider — plan is informational only', () => {
    const episode = makeEpisode();
    const plan = buildEpisodeRenderPlan(episode);
    expect(plan.notes.join(' ')).toMatch(/informational only/);
  });
});
