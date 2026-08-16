#!/usr/bin/env tsx
/**
 * content:youtube:publish -- <episode-id> --video <path.mp4> --made-for-kids <true|false> [--live] [--privacy private|unlisted|public] [--lang es|en|...] [--playlist <id>]
 *
 * Uploads an already-rendered local video file to YouTube for one episode.
 * Dry-run by default — prints exactly what would be uploaded and exits
 * without calling the API. Pass --live to actually publish.
 *
 * Approval gate: refuses to publish (live or dry-run) unless the episode's
 * production.status is 'reviewed' or 'published' — storyboard/idea-stage
 * episodes can't be uploaded by accident.
 *
 * Credentials: read from YOUTUBE_CLIENT_ID / YOUTUBE_CLIENT_SECRET /
 * YOUTUBE_REFRESH_TOKEN via Doppler — never pass them as CLI args.
 *   doppler run --project ops-intcloudsysops --config prd -- \
 *     npm run content:youtube:publish -- <episode-id> --video out.mp4 --made-for-kids false --live
 *
 * See docs/runbooks/YOUTUBE-PUBLISHING.md for full setup.
 */
import { readFileSync, writeFileSync, statSync } from 'node:fs';
import {
  EpisodeManager,
  YouTubePublisher,
  loadYouTubeCredentialsFromEnv,
  type YouTubePrivacyStatus,
} from '../../lib/content-studio/src/index.js';
import { SERIES_DIR } from './_paths.js';
import { join } from 'node:path';
import { readdirSync } from 'node:fs';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const episodeId = process.argv[2];
const videoPath = arg('video');
const madeForKidsRaw = arg('made-for-kids');
const live = flag('live');
const privacy = (arg('privacy') ?? 'private') as YouTubePrivacyStatus;
const lang = arg('lang') ?? 'es';
const playlistId = arg('playlist');

if (!episodeId || episodeId.startsWith('--')) {
  console.error('Usage: npm run content:youtube:publish -- <episode-id> --video <path.mp4> --made-for-kids <true|false> [--live] [--privacy private|unlisted|public] [--lang es] [--playlist <id>]');
  process.exit(1);
}
if (!videoPath) {
  console.error('Missing required --video <path.mp4>');
  process.exit(1);
}
if (madeForKidsRaw !== 'true' && madeForKidsRaw !== 'false') {
  console.error('Missing or invalid --made-for-kids <true|false> — required, no default (COPPA).');
  process.exit(1);
}
const madeForKids = madeForKidsRaw === 'true';

if (!['private', 'unlisted', 'public'].includes(privacy)) {
  console.error(`Invalid --privacy "${privacy}" — must be private, unlisted, or public.`);
  process.exit(1);
}

const episodes = new EpisodeManager({ seriesDir: SERIES_DIR });
const episode = episodes.getById(episodeId);
if (!episode) {
  console.error(`Episode not found: ${episodeId}`);
  process.exit(1);
}

const allowedStates = ['reviewed', 'published'];
if (!allowedStates.includes(episode.production.status)) {
  console.error(
    `Refusing to publish "${episode.id}": production.status is "${episode.production.status}", ` +
      `must be one of [${allowedStates.join(', ')}]. Approve the episode through the normal review ` +
      `process before publishing — see data/content/canon/CANON-STATUS.md.`
  );
  process.exit(1);
}

let fileSize: number;
try {
  fileSize = statSync(videoPath).size;
} catch {
  console.error(`Video file not found: ${videoPath}`);
  process.exit(1);
}

const title = episode.title[lang] ?? episode.title.es;
const captions = episode.metadata.captions[lang] ?? episode.metadata.captions.es;
const description = `${captions}\n\n${episode.metadata.call_to_action}\n\n${episode.metadata.hashtags.join(' ')}`;
const tags = episode.metadata.hashtags.map((h) => h.replace(/^#/, ''));

console.log(`\nYouTube publish — ${episode.id}${live ? '' : ' (DRY RUN — pass --live to actually upload)'}\n`);
console.log(`Title:          ${title}`);
console.log(`Description:\n${description}\n`);
console.log(`Tags:           ${tags.join(', ')}`);
console.log(`Privacy:        ${privacy}`);
console.log(`Made for kids:  ${madeForKids}`);
console.log(`Video file:     ${videoPath} (${(fileSize / 1024 / 1024).toFixed(1)} MB)`);
if (playlistId) console.log(`Playlist:       ${playlistId}`);

if (!live) {
  console.log('\nDry run complete. No API call made, nothing uploaded.');
  process.exit(0);
}

// Update the episode's production record on disk.
function findEpisodeJsonPath(seriesId: string, id: string): string | undefined {
  const episodesDir = join(SERIES_DIR, seriesId, 'episodes');
  for (const dir of readdirSync(episodesDir)) {
    const candidate = join(episodesDir, dir, 'episode.json');
    try {
      const parsed = JSON.parse(readFileSync(candidate, 'utf-8')) as { id?: string };
      if (parsed.id === id) return candidate;
    } catch {
      // ignore malformed entries — content:validate reports those separately
    }
  }
  return undefined;
}

async function publishLive(): Promise<void> {
  const credentials = loadYouTubeCredentialsFromEnv();
  const publisher = new YouTubePublisher(credentials);

  const result = await publisher.publish({
    file_path: videoPath as string,
    title,
    description,
    tags,
    privacy_status: privacy,
    made_for_kids: madeForKids,
    playlist_id: playlistId,
  });

  console.log(`\nPublished: ${result.url}`);

  const episodeJsonPath = findEpisodeJsonPath(episode.series_id, episode.id);
  if (episodeJsonPath) {
    const data = JSON.parse(readFileSync(episodeJsonPath, 'utf-8'));
    data.production.status = 'published';
    data.production.published_at = result.uploaded_at;
    data.production.last_updated = result.uploaded_at;
    if (!data.production.published_platforms.includes('youtube')) {
      data.production.published_platforms.push('youtube');
    }
    data.production.publish_urls.youtube = result.url;
    writeFileSync(episodeJsonPath, JSON.stringify(data, null, 2) + '\n');
    console.log(`Updated ${episodeJsonPath} — production.status = "published"`);
  } else {
    console.warn(`Warning: could not locate episode.json for ${episode.id} to update production status.`);
  }
}

publishLive().catch((error) => {
  console.error(`\nPublish failed: ${(error as Error).message}`);
  process.exit(1);
});
