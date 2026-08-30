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
