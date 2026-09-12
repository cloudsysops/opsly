import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const manifest = JSON.parse(
  await fs.readFile(path.join(root, 'config/games/astral-arena-transmedia.json'), 'utf8'),
) as {
  storyEvents: Array<{ episodeId: string; missionIds: string[] }>;
};

const series = JSON.parse(
  await fs.readFile(path.join(root, 'data/content/series/astral-arena/series.json'), 'utf8'),
) as { episode_count: number };

const firstChapterDirs = ['001-awakening', '002-orion', '003-aurora', '004-nx7'];
const episodes: Array<{ id: string; series_id: string; episode_number: number; production: { status: string } }> = [];

for (const dir of firstChapterDirs) {
  const episode = JSON.parse(
    await fs.readFile(path.join(root, 'data/content/series/astral-arena/episodes', dir, 'episode.json'), 'utf8'),
  );
  episodes.push(episode);
}

const errors: string[] = [];
if (series.episode_count !== manifest.storyEvents.length) {
  errors.push(`series episode_count ${series.episode_count} != transmedia events ${manifest.storyEvents.length}`);
}

for (const episode of episodes) {
  if (episode.series_id !== 'astral-arena') errors.push(`${episode.id}: wrong series_id`);
  if (!manifest.storyEvents.some((event) => event.episodeId === episode.id)) {
    errors.push(`${episode.id}: missing transmedia story event`);
  }
}

const numbers = episodes.map((episode) => episode.episode_number);
if (new Set(numbers).size !== numbers.length) errors.push('duplicate episode_number in first chapter');

if (errors.length) {
  console.error('Astral Content Studio series validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Astral Content Studio series: OK · ${episodes.length} scripted episodes · ${series.episode_count} Season 1 slots`,
);
