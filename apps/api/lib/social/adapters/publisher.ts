// Multi-platform publisher orchestrator

import { TwitterAdapter } from './twitter-adapter';
import { LinkedInAdapter } from './linkedin-adapter';
import { DiscordAdapter } from './discord-adapter';
import { SlackAdapter } from './slack-adapter';

type SupportedPlatform = 'twitter' | 'linkedin' | 'discord' | 'slack';


  twitter?: {
    threads: string[];
    hashtags: string[];
  };
  linkedin?: {
    title: string;
    body: string;
    tags: string[];
  };
  discord?: {
    content: string;
    embeds: Array<{
      title: string;
      description: string;
      color: number;
    }>;
  };
  slack?: {
    text: string;
    blocks: Array<{
      type: string;
      text?: {
        type: string;
        text: string;
      };
    }>;
  };
}

export interface PublishResult {
  platform: string;
  success: boolean;
  post_id?: string;
  url?: string;
  error?: string;
}

export class MultiPlatformPublisher {
  private twitter: TwitterAdapter;
  private linkedin: LinkedInAdapter;
  private discord: DiscordAdapter;
  private slack: SlackAdapter;

  constructor() {
    this.twitter = new TwitterAdapter();
    this.linkedin = new LinkedInAdapter();
    this.discord = new DiscordAdapter();
    this.slack = new SlackAdapter();
  }

  async publishToAll(content: ContentPayload, platforms: string[]): Promise<PublishResult[]> {
    const results: PublishResult[] = [];

    for (const platform of platforms) {
      const result = await this.publishToPlatform(platform, content);
      results.push(result);
    }

    return results;
  }

  private async publishToPlatform(
    platform: string,
    content: ContentPayload
  ): Promise<PublishResult> {
    try {
      const handlers: Record<SupportedPlatform, () => Promise<PublishResult>> = {
        twitter: () => this.publishToTwitter(content),
        linkedin: () => this.publishToLinkedIn(content),
        discord: () => this.publishToDiscord(content),
        slack: () => this.publishToSlack(content),
      };
      const handler = handlers[platform as SupportedPlatform];
      if (!handler) {
        return { platform, success: false, error: 'Unknown platform' };
      }
      return await handler();
    } catch (error) {
      return {
        platform,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async publishToTwitter(content: ContentPayload): Promise<PublishResult> {
    if (!content.twitter) {
      return { platform: 'twitter', success: false, error: 'No Twitter content' };
    }
    const posts = await this.twitter.publishThreads(content.twitter);
    return {
      platform: 'twitter',
      success: posts.length > 0,
      post_id: posts[0]?.id,
      url: `https://twitter.com/opsly/status/${posts[0]?.id}`,
    };
  }

  private async publishToLinkedIn(content: ContentPayload): Promise<PublishResult> {
    if (!content.linkedin) {
      return { platform: 'linkedin', success: false, error: 'No LinkedIn content' };
    }
    const post = await this.linkedin.publishPost(content.linkedin);
    return {
      platform: 'linkedin',
      success: post !== null,
      post_id: post?.id,
      url: post?.url,
    };
  }

  private async publishToDiscord(content: ContentPayload): Promise<PublishResult> {
    if (!content.discord) {
      return { platform: 'discord', success: false, error: 'No Discord content' };
    }
    const message = await this.discord.publishMessage(content.discord);
    return {
      platform: 'discord',
      success: message !== null,
      post_id: message?.id,
    };
  }

  private async publishToSlack(content: ContentPayload): Promise<PublishResult> {
    if (!content.slack) {
      return { platform: 'slack', success: false, error: 'No Slack content' };
    }
    const message = await this.slack.publishMessage(content.slack);
    return {
      platform: 'slack',
      success: message !== null,
      post_id: message?.ts,
    };
  }
}

export const multiPlatformPublisher = new MultiPlatformPublisher();
