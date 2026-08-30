#!/usr/bin/env tsx
/**
 * content:episode -- <episode-id> — show full details for a single episode.
 * Usage: npm run content:episode -- opsly-origins-001
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import {
  EpisodeManager,
  CharacterRegistry,
  SeriesRegistry,
  loadEpisodeScript,
} from '../../lib/content-studio/src/index.js';
import { SERIES_DIR, CHARACTERS_DIR } from './_paths.js';

const episodeId = process.argv[2];
if (!episodeId) {
  console.error('Usage: npm run content:episode -- <episode-id>');
  process.exit(1);
}

const episodes = new EpisodeManager({ seriesDir: SERIES_DIR });
const series = new SeriesRegistry({ seriesDir: SERIES_DIR });
const characters = new CharacterRegistry({ charactersDir: CHARACTERS_DIR });

const episode = episodes.getById(episodeId);
if (!episode) {
  console.error(`Episode not found: ${episodeId}`);
  console.error('Run "npm run content:list" to see available episode ids.');
  process.exit(1);
}

const parentSeries = series.getById(episode.series_id);

console.log(`\n${episode.title.es} / ${episode.title.en}`);
console.log(
  `${episode.id} · ${parentSeries?.name ?? episode.series_id} · ${episode.duration_estimate_sec}s · status: ${episode.production.status}\n`
);
console.log(`Hook (ES): ${episode.hook.es}`);
console.log(`Hook (EN): ${episode.hook.en}\n`);
console.log(`Objective: ${episode.objective}`);
console.log(`Audience: ${episode.audience.join(', ')}\n`);

if (parentSeries) {
  console.log(
    `Characters: ${parentSeries.characters
      .map((id) => characters.getById(id)?.canonical_name ?? id)
      .join(', ')}\n`
  );
}

if (episode.scenes.length > 0) {
  console.log(`Scenes (${episode.scenes.length}):`);
  for (const scene of episode.scenes) {
    console.log(`  ${scene.number}. [${scene.duration_sec}s] ${scene.description}`);
    console.log(`     visuals: ${scene.visuals}`);
    console.log(`     copy: ${scene.copy}`);
    if (scene.assets_needed.length > 0) {
      console.log(`     assets: ${scene.assets_needed.join(', ')}`);
    }
  }
  console.log('');
} else {
  console.log('Scenes: none yet (idea stage)\n');
}

console.log(`CTA: ${episode.metadata.call_to_action}`);
console.log(`Hashtags: ${episode.metadata.hashtags.join(' ')}`);
console.log(`Thumbnail concept: ${episode.metadata.thumbnail_concept}\n`);

// Locate this episode's own directory (episode ids and directory slugs differ)
// by scanning series/<series>/episodes/* and matching episode.json's id field.
function findEpisodeDir(seriesId: string, id: string): string | undefined {
  const episodesDir = join(SERIES_DIR, seriesId, 'episodes');
  const dirs = readdirSync(episodesDir).filter((d) => statSync(join(episodesDir, d)).isDirectory());
  for (const dir of dirs) {
    const candidate = join(episodesDir, dir);
    try {
      const parsed = JSON.parse(readFileSync(join(candidate, 'episode.json'), 'utf-8')) as { id?: string };
      if (parsed.id === id) return candidate;
    } catch {
      // ignore malformed entries here — content:validate reports those separately
    }
  }
  return undefined;
}

const episodeDir = findEpisodeDir(episode.series_id, episode.id);
const script = episodeDir ? loadEpisodeScript(episodeDir) : undefined;
if (script) {
  console.log('--- script.md ---\n');
  console.log(script);
}

if (episode.production.notes.length > 0) {
  console.log('\nProduction notes:');
  for (const note of episode.production.notes) console.log(`  - ${note}`);
}
