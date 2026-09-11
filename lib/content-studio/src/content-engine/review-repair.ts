import fs from 'node:fs';
import path from 'node:path';
import { normalizeAudio, trimMedia } from './ffmpeg.js';
import { getContentProjectArtifactsRoot } from './paths.js';
import type { ArtifactVersion, ContentProjectEnvelope, ReviewFinding } from './types.js';
import { reviewAgentIds } from './types.js';

function nextVersionLabel(existing: ArtifactVersion[]): string {
  return `video-v${existing.length + 1}`;
}

export async function repairFromFindings(
  envelope: ContentProjectEnvelope,
  findings: ReviewFinding[],
  baseDir = process.cwd(),
): Promise<ContentProjectEnvelope> {
  const approved = findings.filter((item) => item.repairable && item.severity !== 'MINOR');
  const current = envelope.aiReview?.versions.find((item) => item.id === envelope.aiReview?.currentVersionId);
  if (!current || !fs.existsSync(current.path)) {
    throw new Error('REPAIR_BLOCKED: no current artifact version');
  }

  const artifacts = getContentProjectArtifactsRoot(envelope.project.id, baseDir);
  const versionsDir = path.join(artifacts, 'versions');
  fs.mkdirSync(versionsDir, { recursive: true });
  const label = nextVersionLabel(envelope.aiReview?.versions ?? []);
  const output = path.join(versionsDir, `${label}.mp4`);
  if (fs.existsSync(output)) {
    throw new Error(`REPAIR_BLOCKED: ${label} already exists — never overwrite`);
  }

  const leading = approved
    .filter((item) => item.finding_id.startsWith('black-') || item.finding_id.startsWith('silence-'))
    .filter((item) => item.timecode_start <= 0.15)
    .sort((a, b) => b.timecode_end - a.timecode_end)[0];

  if (leading) {
    await trimMedia(current.path, output, leading.timecode_end);
  } else if (approved.some((item) => item.finding_id === 'audio-quiet')) {
    await normalizeAudio(current.path, output);
  } else if (approved.some((item) => item.finding_id === 'format-aspect')) {
    const { verticalReframe } = await import('./ffmpeg.js');
    await verticalReframe(current.path, output);
  } else if (approved.length > 0) {
    await trimMedia(current.path, output, 0);
  } else {
    fs.copyFileSync(current.path, output);
  }

  const version: ArtifactVersion = {
    id: label,
    label,
    path: output,
    parentVersion: current.id,
    findingsAddressed: approved.map((item) => item.finding_id),
    reviewScore: null,
    createdAt: new Date().toISOString(),
    createdBy: reviewAgentIds.repair,
  };

  return {
    ...envelope,
    aiReview: envelope.aiReview
      ? {
          ...envelope.aiReview,
          state: 'repairing',
          currentVersionId: version.id,
          versions: [...envelope.aiReview.versions, version],
        }
      : envelope.aiReview,
    renderJobs: [
      {
        id: `render-${label}`,
        projectId: envelope.project.id,
        status: 'completed' as const,
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
        outputPath: output,
        logs: [`repaired from ${current.id}`, ...approved.map((item) => item.finding_id)],
      },
      ...envelope.renderJobs,
    ],
  };
}
