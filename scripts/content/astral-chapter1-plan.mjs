#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '../..');
const packPath = path.join(root, 'config/games/astral-arena-chapter-01-production.json');
const pack = JSON.parse(await fs.readFile(packPath, 'utf8'));

const json = process.argv.includes('--json');

const jobs = pack.episodes.flatMap((episode) =>
  episode.deliverables.map((deliverable, index) => ({
    jobId: `${episode.episodeId}-${String(index + 1).padStart(2, '0')}-${deliverable.type}`,
    franchiseId: pack.franchiseId,
    seasonId: pack.seasonId,
    chapterId: pack.chapterId,
    episodeId: episode.episodeId,
    storyEventId: episode.storyEventId,
    missionIds: episode.missionIds,
    captureMarkers: episode.captureMarkers,
    deliverable,
    approval: pack.approval,
  })),
);

if (json) {
  console.log(JSON.stringify({ schemaVersion: 1, jobs }, null, 2));
} else {
  console.log(`Astral Chapter 1 production plan · ${jobs.length} deliverables`);
  for (const job of jobs) {
    console.log(
      `- ${job.jobId} · ${job.deliverable.aspect} · ${job.deliverable.source}`,
    );
  }
}
