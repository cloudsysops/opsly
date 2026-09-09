import fs from 'node:fs';
import path from 'node:path';
import { getContentProjectArtifactsRoot } from './paths.js';
import type { ContentProjectEnvelope, PlatformVariantPackage, PublishingPlatform } from './types.js';
import { publishingPlatformValues } from './types.js';

const VARIANT_SPEC: Record<PublishingPlatform, { aspectRatio: PlatformVariantPackage['aspectRatio']; maxDurationSec: number }> = {
  youtube: { aspectRatio: '9:16', maxDurationSec: 60 },
  tiktok: { aspectRatio: '9:16', maxDurationSec: 60 },
  instagram: { aspectRatio: '9:16', maxDurationSec: 90 },
  facebook: { aspectRatio: '9:16', maxDurationSec: 90 },
  x: { aspectRatio: '9:16', maxDurationSec: 140 },
};

export function buildDistributionPackages(
  envelope: ContentProjectEnvelope,
  baseDir = process.cwd(),
): PlatformVariantPackage[] {
  const current = envelope.aiReview?.versions.find((item) => item.id === envelope.aiReview?.currentVersionId);
  const master = current?.path ?? envelope.renderJobs[0]?.outputPath;
  if (!master || !fs.existsSync(master)) {
    throw new Error('DISTRIBUTION_BLOCKED: master video missing');
  }
  const artifacts = getContentProjectArtifactsRoot(envelope.project.id, baseDir);
  const title = envelope.metadata?.title ?? envelope.project.title;
  const description = envelope.metadata?.description ?? title;
  const hashtags = (envelope.metadata?.tags ?? ['gameplay']).map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
  const thumbnail = fs.existsSync(path.join(artifacts, 'thumbnail.jpg'))
    ? path.join(artifacts, 'thumbnail.jpg')
    : undefined;

  return publishingPlatformValues.map((platform) => ({
    platform,
    aspectRatio: VARIANT_SPEC[platform].aspectRatio,
    maxDurationSec: VARIANT_SPEC[platform].maxDurationSec,
    videoPath: master,
    title,
    caption: title,
    description,
    hashtags,
    thumbnailPath: thumbnail,
  }));
}

export function writeDistributionManifest(
  envelope: ContentProjectEnvelope,
  packages: PlatformVariantPackage[],
  baseDir = process.cwd(),
): string {
  const artifacts = getContentProjectArtifactsRoot(envelope.project.id, baseDir);
  const file = path.join(artifacts, 'distribution.json');
  fs.writeFileSync(
    file,
    `${JSON.stringify(
      {
        master: packages[0]?.videoPath,
        packages,
        generatedFrom: envelope.aiReview?.currentVersionId ?? 'unknown',
      },
      null,
      2,
    )}\n`,
  );
  return file;
}
