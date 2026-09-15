import fs from 'node:fs';
import path from 'node:path';
import { getContentProjectArtifactsRoot } from './paths.js';
import type { ContentProjectEnvelope } from './types.js';

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function writeGameplayArtifactBundle(
  envelope: ContentProjectEnvelope,
  baseDir = process.cwd(),
): string {
  const artifacts = getContentProjectArtifactsRoot(envelope.project.id, baseDir);
  fs.mkdirSync(artifacts, { recursive: true });
  const currentVersion = envelope.aiReview?.versions.find((item) => item.id === envelope.aiReview?.currentVersionId);
  const firstOutput = currentVersion?.path ?? envelope.renderJobs[0]?.outputPath;
  if (firstOutput && fs.existsSync(firstOutput)) {
    fs.copyFileSync(firstOutput, path.join(artifacts, 'final.mp4'));
  }
  writeJson(path.join(artifacts, 'metadata.json'), envelope.metadata ?? {});
  writeJson(path.join(artifacts, 'review.json'), envelope.aiReview ?? null);
  writeJson(path.join(artifacts, 'rights.json'), {
    GAMEPLAY_RIGHTS: envelope.rightsManifest?.GAMEPLAY_RIGHTS ?? (envelope.project.mode === 'original' ? 'OWNED' : 'UNKNOWN'),
    MUSIC_RIGHTS: envelope.rightsManifest?.MUSIC_RIGHTS ?? 'UNKNOWN',
    ASSET_RIGHTS: envelope.rightsManifest?.ASSET_RIGHTS ?? (envelope.project.mode === 'original' ? 'OWNED' : 'UNKNOWN'),
    DRAGON_ASSETS: envelope.rightsManifest?.DRAGON_ASSETS ?? 'NONE',
    THUMBNAIL_ASSETS: envelope.rightsManifest?.THUMBNAIL_ASSETS ?? 'UNKNOWN',
    verdict: envelope.rights?.verdict ?? 'UNKNOWN',
    reasons: envelope.rights?.reasons ?? [],
    publishReady: false,
  });
  const captionLines = (envelope.clipCandidates ?? [])
    .map((clip, index) => `${index + 1}\n00:00:00,000 --> 00:00:${String(Math.min(8, Math.round(clip.duration))).padStart(2, '0')},000\n${clip.hook}\n`)
    .join('\n');
  const captionsPath = path.join(artifacts, 'captions.srt');
  fs.writeFileSync(captionsPath, captionLines);
  writeJson(path.join(artifacts, 'qa.json'), {
    flags: envelope.qaFlags ?? [],
    VIDEO_VALID: Boolean(firstOutput && fs.existsSync(firstOutput)),
    AUDIO_VALID: Boolean(envelope.assets[0]),
    CAPTIONS_VALID: fs.existsSync(captionsPath) && captionLines.trim().length > 0,
    RIGHTS_PASS: envelope.rights?.verdict !== 'BLOCKED',
    HOOK_PRESENT: (envelope.clipCandidates ?? []).some((clip) => clip.hook.trim().length > 0),
    AI_DECISION: envelope.aiReview?.decision ?? null,
    AI_SCORE: envelope.aiReview?.score?.total ?? null,
    AI_ROUND: envelope.aiReview?.round ?? 0,
  });
  writeJson(path.join(artifacts, 'manifest.json'), {
    projectId: envelope.project.id,
    session: envelope.session,
    approval: envelope.approval?.state ?? null,
    status: envelope.project.status,
    selectedClipIds: envelope.selectedClipIds ?? [],
    candidates: envelope.clipCandidates ?? [],
    publishing: process.env.OPSLY_CONTENT_PUBLISHING ?? 'disabled',
    autoPublish: process.env.OPSLY_CONTENT_AUTO_PUBLISH === 'true',
    artifacts: {
      final: 'final.mp4',
      thumbnail: 'thumbnail.jpg',
      captions: 'captions.srt',
      metadata: 'metadata.json',
      rights: 'rights.json',
      qa: 'qa.json',
    },
  });
  return artifacts;
}
