#!/usr/bin/env tsx
/**
 * content:calendar — show the 30-day launch campaign schedule joined with
 * live episode status.
 */
import { EpisodeManager, CampaignManager } from '../../lib/content-studio/src/index.js';
import { SERIES_DIR, DEFAULT_CAMPAIGN_JSON } from './_paths.js';

const episodes = new EpisodeManager({ seriesDir: SERIES_DIR });
const campaignManager = new CampaignManager(DEFAULT_CAMPAIGN_JSON);
const campaign = campaignManager.load();
const calendar = campaignManager.calendar(episodes.list());
const status = campaignManager.status(episodes.list());

console.log(`\n${campaign.name} (${campaign.id})`);
console.log(`${campaign.start_date} → ${campaign.end_date} · ${campaign.episode_schedule.length} episodes\n`);

const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
for (const day of calendar) {
  const dow = dayNames[day.day_of_week] ?? '?';
  console.log(
    `  ${day.date} (${dow})  [${(day.status ?? 'unknown').padEnd(10)}]  ${day.episode_id}${
      day.episode_title ? ` — ${day.episode_title}` : ''
    }`
  );
}

console.log('\nProduction status:');
console.log(`  planned:     ${status.episodes_planned}`);
console.log(`  scripted:    ${status.episodes_scripted}`);
console.log(`  with assets: ${status.episodes_with_assets}`);
console.log(`  rendered:    ${status.episodes_rendered}`);
console.log(`  reviewed:    ${status.episodes_reviewed}`);
console.log(`  published:   ${status.episodes_published}`);
