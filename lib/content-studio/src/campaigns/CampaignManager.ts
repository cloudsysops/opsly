import { readFileSync } from 'node:fs';
import type { Campaign, Episode } from '../types.js';
import { CampaignSchema } from './schema.js';

function readJson(path: string): unknown {
  const raw = readFileSync(path, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Invalid JSON in ${path}: ${(error as Error).message}`);
  }
}

export function loadCampaign(campaignJsonPath: string): Campaign {
  const parsed = CampaignSchema.safeParse(readJson(campaignJsonPath));
  if (!parsed.success) {
    throw new Error(
      `Campaign validation failed for ${campaignJsonPath}: ${parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ')}`
    );
  }
  return parsed.data;
}

export interface CampaignCalendarDay {
  date: string;
  day_of_week: number;
  episode_id: string;
  episode_title?: string;
  series_id?: string;
  status?: string;
}

/** Join a campaign's raw schedule with live episode data (title + status) for display. */
export function buildCalendarView(campaign: Campaign, episodes: Episode[]): CampaignCalendarDay[] {
  const byId = new Map(episodes.map((e) => [e.id, e]));
  return [...campaign.episode_schedule]
    .sort((a, b) => a.scheduled_publish_date.localeCompare(b.scheduled_publish_date))
    .map((entry) => {
      const episode = byId.get(entry.episode_id);
      return {
        date: entry.scheduled_publish_date,
        day_of_week: entry.day_of_week,
        episode_id: entry.episode_id,
        episode_title: episode?.title.es,
        series_id: episode?.series_id,
        status: episode?.production.status,
      };
    });
}

/** Recompute production_status counters from the live episode set (does not mutate the campaign file). */
export function computeProductionStatus(
  campaign: Campaign,
  episodes: Episode[]
): Campaign['production_status'] {
  const scheduled = new Set(campaign.episode_schedule.map((e) => e.episode_id));
  const relevant = episodes.filter((e) => scheduled.has(e.id));

  const atLeast = (states: string[]) =>
    relevant.filter((e) => states.includes(e.production.status)).length;

  return {
    episodes_planned: relevant.length,
    episodes_scripted: atLeast(['script', 'storyboard', 'assets', 'rendered', 'reviewed', 'published']),
    episodes_with_assets: atLeast(['assets', 'rendered', 'reviewed', 'published']),
    episodes_rendered: atLeast(['rendered', 'reviewed', 'published']),
    episodes_reviewed: atLeast(['reviewed', 'published']),
    episodes_published: atLeast(['published']),
  };
}

export class CampaignManager {
  constructor(private readonly campaignJsonPath: string) {}

  load(): Campaign {
    return loadCampaign(this.campaignJsonPath);
  }

  calendar(episodes: Episode[]): CampaignCalendarDay[] {
    return buildCalendarView(this.load(), episodes);
  }

  status(episodes: Episode[]): Campaign['production_status'] {
    return computeProductionStatus(this.load(), episodes);
  }
}
