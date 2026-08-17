import { describe, it, expect } from 'vitest';
import { buildCalendarView, computeProductionStatus } from '../CampaignManager.js';
import type { Campaign, Episode } from '../../types.js';

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'OPSLY_CHANNEL_LAUNCH_30_DAYS',
    name: 'Opsly Channel Launch',
    description: '30 day launch campaign',
    series_ids: ['opsly-origins'],
    duration_days: 30,
    start_date: '2026-08-01',
    end_date: '2026-08-30',
    episode_schedule: [
      { episode_id: 'opsly-origins-001', scheduled_publish_date: '2026-08-03', day_of_week: 0 },
      { episode_id: 'opsly-origins-002', scheduled_publish_date: '2026-08-10', day_of_week: 0 },
    ],
    objectives: ['Launch the channel'],
    target_platforms: ['youtube'],
    production_status: {
      episodes_planned: 2,
      episodes_scripted: 0,
      episodes_with_assets: 0,
      episodes_rendered: 0,
      episodes_reviewed: 0,
      episodes_published: 0,
    },
    ...overrides,
  };
}

function makeEpisode(id: string, status: Episode['production']['status']): Episode {
  return {
    id,
    series_id: 'opsly-origins',
    episode_number: 1,
    title: { es: 'Título', en: 'Title' },
    hook: { es: 'Hook', en: 'Hook' },
    objective: 'obj',
    audience: ['founders'],
    duration_estimate_sec: 60,
    scenes: [],
    metadata: { call_to_action: 'CTA', captions: { es: '', en: '' }, hashtags: [], thumbnail_concept: '' },
    production: {
      status,
      created_at: '2026-08-01T00:00:00Z',
      last_updated: '2026-08-01T00:00:00Z',
      published_platforms: [],
      publish_urls: {},
      notes: [],
    },
  };
}

describe('buildCalendarView', () => {
  it('sorts schedule entries by date and joins episode metadata', () => {
    const campaign = makeCampaign();
    const episodes = [makeEpisode('opsly-origins-001', 'published'), makeEpisode('opsly-origins-002', 'idea')];
    const calendar = buildCalendarView(campaign, episodes);
    expect(calendar).toHaveLength(2);
    expect(calendar[0]?.episode_id).toBe('opsly-origins-001');
    expect(calendar[0]?.status).toBe('published');
  });
});

describe('computeProductionStatus', () => {
  it('counts only episodes referenced in the schedule', () => {
    const campaign = makeCampaign();
    const episodes = [
      makeEpisode('opsly-origins-001', 'published'),
      makeEpisode('opsly-origins-002', 'script'),
      makeEpisode('opsly-origins-999', 'published'), // not in schedule
    ];
    const status = computeProductionStatus(campaign, episodes);
    expect(status.episodes_planned).toBe(2);
    expect(status.episodes_published).toBe(1);
    expect(status.episodes_scripted).toBe(2);
  });
});
