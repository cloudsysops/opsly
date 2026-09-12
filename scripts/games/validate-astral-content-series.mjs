import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const manifest = JSON.parse(
  await fs.readFile(path.join(root, 'config/games/astral-arena-transmedia.json'), 'utf8'),
);
const series = JSON.parse(
  await fs.readFile(path.join(root, 'data/content/series/astral-arena/series.json'), 'utf8'),
);

const episodesRoot = path.join(root, 'data/content/series/astral-arena/episodes');
const episodeDirs = (await fs.readdir(episodesRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const episodes = [];
for (const dir of episodeDirs) {
  const episode = JSON.parse(
    await fs.readFile(path.join(episodesRoot, dir, 'episode.json'), 'utf8'),
  );
  episodes.push(episode);
}

const errors = [];
if (series.episode_count !== manifest.storyEvents.length) {
  errors.push(`series episode_count ${series.episode_count} != transmedia events ${manifest.storyEvents.length}`);
}

for (const episode of episodes) {
  if (episode.series_id !== 'astral-arena') errors.push(`${episode.id}: wrong series_id`);
  if (!manifest.storyEvents.some((event) => event.episodeId === episode.id)) {
    errors.push(`${episode.id}: missing transmedia story event`);
  }
}

if (episodes.length !== series.episode_count) {
  errors.push(`episode files ${episodes.length} != series episode_count ${series.episode_count}`);
}

for (const event of manifest.storyEvents) {
  if (!episodes.some((episode) => episode.id === event.episodeId)) {
    errors.push(`transmedia episode slot missing from Content Studio: ${event.episodeId}`);
  }
}

const numbers = episodes.map((episode) => episode.episode_number);
if (new Set(numbers).size !== numbers.length) errors.push('duplicate episode_number in Season 1');
for (let expected = 1; expected <= series.episode_count; expected += 1) {
  if (!numbers.includes(expected)) errors.push(`missing episode_number ${expected}`);
}

const storyboarded = episodes.filter((episode) => episode.production?.status === 'storyboard').length;
const ideas = episodes.filter((episode) => episode.production?.status === 'idea').length;

if (errors.length) {
  console.error('Astral Content Studio series validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Astral Content Studio series: OK · ${episodes.length} episode slots · ${storyboarded} storyboard · ${ideas} idea`,
);
