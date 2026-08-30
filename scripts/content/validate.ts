#!/usr/bin/env tsx
/**
 * content:validate — schema-validate every character/series/episode/campaign
 * and run compliance checks (secrets/PII) on every episode's text content.
 * Exits non-zero if anything fails.
 */
import {
  CharacterRegistry,
  SeriesRegistry,
  EpisodeManager,
  CampaignManager,
} from '../../lib/content-studio/src/index.js';
import { CHARACTERS_DIR, SERIES_DIR, DEFAULT_CAMPAIGN_JSON } from './_paths.js';

let failures = 0;

function fail(message: string): void {
  console.error(`✗ ${message}`);
  failures += 1;
}

function ok(message: string): void {
  console.log(`✓ ${message}`);
}

// Characters
try {
  const characters = new CharacterRegistry({ charactersDir: CHARACTERS_DIR });
  const all = characters.getAll();
  ok(`${all.length} character(s) valid`);
} catch (error) {
  fail(`Character validation error: ${(error as Error).message}`);
}

// Series
let seriesIds: string[] = [];
try {
  const series = new SeriesRegistry({ seriesDir: SERIES_DIR });
  const all = series.getAll();
  seriesIds = all.map((s) => s.id);
  ok(`${all.length} series valid`);
} catch (error) {
  fail(`Series validation error: ${(error as Error).message}`);
}

// Episodes + compliance
let episodeIds = new Set<string>();
try {
  const episodes = new EpisodeManager({ seriesDir: SERIES_DIR });
  const results = episodes.validateAll();
  episodeIds = new Set(results.map((r) => r.episode.id));
  ok(`${results.length} episode(s) schema-valid`);

  for (const { episode, compliance } of results) {
    if (!compliance.isCompliant) {
      fail(
        `Episode ${episode.id} failed compliance: ${compliance.violations
          .map((v) => `${v.type} (${v.severity})`)
          .join(', ')}`
      );
    }
  }
  if (results.every((r) => r.compliance.isCompliant)) {
    ok('All episodes pass compliance (no secrets/PII detected)');
  }

  const unknownSeries = results.filter((r) => !seriesIds.includes(r.episode.series_id));
  if (unknownSeries.length > 0) {
    fail(`Episodes referencing unknown series: ${unknownSeries.map((r) => r.episode.id).join(', ')}`);
  }
} catch (error) {
  fail(`Episode validation error: ${(error as Error).message}`);
}

// Campaign
try {
  const campaignManager = new CampaignManager(DEFAULT_CAMPAIGN_JSON);
  const campaign = campaignManager.load();
  ok(`Campaign "${campaign.id}" valid (${campaign.episode_schedule.length} scheduled episodes)`);

  const missing = campaign.episode_schedule.filter((entry) => !episodeIds.has(entry.episode_id));
  if (missing.length > 0) {
    fail(`Campaign references unknown episode ids: ${missing.map((m) => m.episode_id).join(', ')}`);
  } else {
    ok('All scheduled episode ids resolve to real episodes');
  }
} catch (error) {
  fail(`Campaign validation error: ${(error as Error).message}`);
}

console.log('');
if (failures > 0) {
  console.error(`${failures} validation failure(s).`);
  process.exit(1);
} else {
  console.log('All content validation checks passed.');
}
