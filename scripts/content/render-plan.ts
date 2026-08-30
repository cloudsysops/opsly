#!/usr/bin/env tsx
/**
 * content:render-plan -- <episode-id> — print a dry-run render plan.
 * Does NOT call any render provider, does NOT publish, does NOT incur cost.
 * Usage: npm run content:render-plan -- opsly-origins-001
 */
import { EpisodeManager, buildEpisodeRenderPlan } from '../../lib/content-studio/src/index.js';
import { SERIES_DIR } from './_paths.js';

const episodeId = process.argv[2];
if (!episodeId) {
  console.error('Usage: npm run content:render-plan -- <episode-id>');
  process.exit(1);
}

const episodes = new EpisodeManager({ seriesDir: SERIES_DIR });
const episode = episodes.getById(episodeId);
if (!episode) {
  console.error(`Episode not found: ${episodeId}`);
  process.exit(1);
}

const plan = buildEpisodeRenderPlan(episode);

console.log(`\nRender plan — ${episode.id} (dry-run, no execution)\n`);
console.log(`Status: ${plan.status}`);
console.log(`Ready to render: ${plan.ready_to_render ? 'yes' : 'no'}`);
if (plan.blocking_reasons.length > 0) {
  console.log('Blocking reasons:');
  for (const reason of plan.blocking_reasons) console.log(`  - ${reason}`);
}
console.log(`\nTotal duration: ${plan.total_duration_sec}s across ${plan.scenes.length} scene(s)`);
console.log('\nAssets required:');
for (const asset of plan.assets_required) console.log(`  - ${asset}`);
console.log('\nSuggested pipeline:');
plan.suggested_pipeline.forEach((step, i) => console.log(`  ${i + 1}. ${step}`));
console.log('\nNotes:');
for (const note of plan.notes) console.log(`  - ${note}`);
console.log('');
