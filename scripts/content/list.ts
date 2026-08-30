#!/usr/bin/env tsx
/**
 * content:list — list every episode across all series with its production status.
 * Usage: npm run content:list [-- --series <series-id>]
 */
import { EpisodeManager, SeriesRegistry } from '../../lib/content-studio/src/index.js';
import { SERIES_DIR } from './_paths.js';

const seriesFilter = process.argv.includes('--series')
  ? process.argv[process.argv.indexOf('--series') + 1]
  : undefined;

const series = new SeriesRegistry({ seriesDir: SERIES_DIR });
const episodes = new EpisodeManager({ seriesDir: SERIES_DIR });

const all = seriesFilter ? episodes.listBySeries(seriesFilter) : episodes.list();

console.log(`\nOpsly Content — ${all.length} episode(s)${seriesFilter ? ` in "${seriesFilter}"` : ''}\n`);

for (const s of series.getAll()) {
  if (seriesFilter && s.id !== seriesFilter) continue;
  const seriesEpisodes = all.filter((e) => e.series_id === s.id);
  if (seriesEpisodes.length === 0) continue;
  console.log(`## ${s.name} (${s.id})`);
  for (const ep of seriesEpisodes) {
    const duration = `${ep.duration_estimate_sec}s`;
    console.log(`  [${ep.production.status.padEnd(10)}] ${ep.id} — ${ep.title.es} (${duration})`);
  }
  console.log('');
}
