import fs from 'node:fs/promises';
import path from 'node:path';
import {
  getAstralArenaMission,
} from '@intcloudsysops/game-core';

const root = path.resolve(import.meta.dirname, '../..');
const manifestPath = path.join(root, 'config/games/astral-arena-transmedia.json');
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8')) as {
  franchiseId: string;
  season: {
    id: string;
    chapters: Array<{ id: string; missionIds: string[] }>;
  };
  storyEvents: Array<{
    id: string;
    missionIds: string[];
    episodeId: string;
    status: string;
  }>;
};

const errors: string[] = [];

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
  try {
    const mission = getAstralArenaMission(missionId);
    if (!mission || mission.id !== missionId) errors.push(`mission lookup mismatch: ${missionId}`);
  } catch {
    errors.push(`transmedia manifest references unknown mission: ${missionId}`);
  }

  if (!eventSet.has(missionId)) {
    errors.push(`mission has no storyEvent mapping: ${missionId}`);
  }
}

for (const event of manifest.storyEvents) {
  if (!event.id.trim()) errors.push('story event missing id');
  if (!event.episodeId.trim()) errors.push(`story event ${event.id} missing episodeId`);
  if (event.missionIds.length === 0) errors.push(`story event ${event.id} has no missionIds`);
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
