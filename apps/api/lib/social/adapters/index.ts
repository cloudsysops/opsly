// Export all adapters

export { TwitterAdapter, twitterAdapter } from './twitter-adapter';
export type { TwitterContent, TwitterPost } from './twitter-adapter';

export { LinkedInAdapter, linkedInAdapter } from './linkedin-adapter';
export type { LinkedInContent, LinkedInPost } from './linkedin-adapter';

export { DiscordAdapter, discordAdapter } from './discord-adapter';
export type { DiscordEmbed, DiscordContent, DiscordMessage } from './discord-adapter';

export { SlackAdapter, slackAdapter } from './slack-adapter';
export type { SlackBlock, SlackContent, SlackMessage } from './slack-adapter';

export { MultiPlatformPublisher, multiPlatformPublisher } from './publisher';
export type { PublishResult, ContentPayload } from './publisher';
