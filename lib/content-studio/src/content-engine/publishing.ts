import type { ContentProjectEnvelope, ContentPublishJob } from './types.js';

export type PublishingPlatform = 'youtube' | 'instagram' | 'tiktok';
export type PublishingPrivacy = 'unlisted' | 'draft' | 'private';

export interface PublishingAdapter {
  platform: PublishingPlatform;
  defaultPrivacy: PublishingPrivacy;
}

export const DEFAULT_PUBLISHING_PRIVACY: PublishingPrivacy = 'unlisted';

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
  assertHumanApprovedPublish(envelope.approval?.state === 'approved');
  if (process.env.OPSLY_CONTENT_AUTO_PUBLISH === 'true') {
    throw new Error('BLOCKED_AUTO_PUBLISH: auto-publish stays off; enqueue is a review record only');
  }
  const job: ContentPublishJob = {
    id: `publish-${Date.now()}`,
    platform,
    status: 'queued',
    retryCount: 0,
  };
  return {
    ...envelope,
    publishJobs: [...(envelope.publishJobs ?? []), job],
  };
}
