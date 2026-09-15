import type { ContentProjectEnvelope, ContentPublishJob, PublishingPlatform } from './types.js';
import { publishingPlatformValues } from './types.js';

export type { PublishingPlatform } from './types.js';
export type PublishingPrivacy = 'unlisted' | 'draft' | 'private';

export interface PublishingAdapter {
  platform: PublishingPlatform;
  defaultPrivacy: PublishingPrivacy;
}

export const DEFAULT_PUBLISHING_PRIVACY: PublishingPrivacy = 'unlisted';
export const PUBLISHING_PLATFORMS = publishingPlatformValues;

export function assertHumanApprovedPublish(approved: boolean): void {
  if (!approved) {
    throw new Error('BLOCKED_PUBLISH: human approval required');
  }
}

export function publishPubliclyNotImplemented(platform: PublishingPlatform): never {
  throw new Error(`BLOCKED_PUBLISHING_ADAPTER: ${platform} public publish is disabled in V1`);
}

export function enqueueApprovedPublishJob(
  envelope: ContentProjectEnvelope,
  platform: PublishingPlatform = 'youtube',
): ContentProjectEnvelope {
  return enqueueApprovedPublishJobs(envelope, [platform]);
}

export function enqueueApprovedPublishJobs(
  envelope: ContentProjectEnvelope,
  platforms: PublishingPlatform[],
): ContentProjectEnvelope {
  assertHumanApprovedPublish(envelope.approval?.state === 'approved');
  if (process.env.OPSLY_CONTENT_AUTO_PUBLISH === 'true') {
    throw new Error('BLOCKED_AUTO_PUBLISH: auto-publish stays off; enqueue is a review record only');
  }
  if (envelope.rightsManifest && !envelope.rightsManifest.publishReady && envelope.rights?.verdict === 'BLOCKED') {
    throw new Error('BLOCKED_PUBLISH: rights manifest is not publish-ready');
  }
  const unique = [...new Set(platforms.filter((item) => publishingPlatformValues.includes(item)))];
  if (unique.length === 0) {
    throw new Error('BLOCKED_PUBLISH: select at least one platform');
  }
  const jobs: ContentPublishJob[] = unique.map((platform, index) => ({
    id: `publish-${Date.now()}-${index}-${platform}`,
    platform,
    status: 'queued',
    retryCount: 0,
  }));
  return {
    ...envelope,
    publishJobs: [...(envelope.publishJobs ?? []), ...jobs],
  };
}
