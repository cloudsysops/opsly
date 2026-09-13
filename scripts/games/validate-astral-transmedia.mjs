import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const manifestPath = path.join(root, 'config/games/astral-arena-transmedia.json');
const missionSourcePath = path.join(root, 'lib/game-core/src/astral-arena.ts');

const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const missionSource = await fs.readFile(missionSourcePath, 'utf8');

const errors = [];

if (manifest.franchiseId !== 'astral-arena') {
  errors.push('franchiseId must be astral-arena');
}

const chapterMissionIds = manifest.season.chapters.flatMap((chapter) => chapter.missionIds);
const eventMissionIds = manifest.storyEvents.flatMap((event) => event.missionIds);
const chapterSet = new Set(chapterMissionIds);
const eventSet = new Set(eventMissionIds);

if (chapterSet.size !== chapterMissionIds.length) {
  errors.push('a mission appears in more than one Season 1 chapter');
}

for (const missionId of chapterSet) {
  const literalSingle = `'${missionId}'`;
  const literalDouble = `"${missionId}"`;
  if (!missionSource.includes(literalSingle) && !missionSource.includes(literalDouble)) {
    errors.push(`transmedia manifest references mission not found in Game Core source: ${missionId}`);
  }
  if (!eventSet.has(missionId)) {
    errors.push(`mission has no storyEvent mapping: ${missionId}`);
  }
}

for (const event of manifest.storyEvents) {
  if (!event.id?.trim()) errors.push('story event missing id');
  if (!event.episodeId?.trim()) errors.push(`story event ${event.id} missing episodeId`);
  if (!Array.isArray(event.missionIds) || event.missionIds.length === 0) {
    errors.push(`story event ${event.id} has no missionIds`);
  }
}

const episodeIds = manifest.storyEvents.map((event) => event.episodeId);
if (new Set(episodeIds).size !== episodeIds.length) {
  errors.push('duplicate episodeId in transmedia manifest');
}

if (errors.length > 0) {
  console.error('Astral transmedia validation failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Astral transmedia validation: OK · ${manifest.season.chapters.length} chapters · ${chapterSet.size} missions · ${manifest.storyEvents.length} story events`,
);
