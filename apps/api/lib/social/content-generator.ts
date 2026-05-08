// Content generator for Syra social media agent

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

export interface ContentJob {
  event_type: 'deployment' | 'milestone' | 'achievement' | 'phase_complete' | 'security_approved';
  source_data: {
    title: string;
    description: string;
    agents_involved: string[];
    metrics?: Record<string, unknown>;
  };
  platforms: ('twitter' | 'linkedin' | 'discord' | 'slack')[];
  requires_approval?: boolean;
}

interface TwitterContent {
  threads: string[];
  hashtags: string[];
}

interface LinkedInContent {
  title: string;
  body: string;
  tags: string[];
}

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
}

interface DiscordContent {
  content: string;
  embeds: DiscordEmbed[];
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
}

interface SlackContent {
  text: string;
  blocks: SlackBlock[];
}

export class SyraContentGenerator {
  private supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  async generateContent(job: ContentJob): Promise<{
    content: {
      twitter?: TwitterContent;
      linkedin?: LinkedInContent;
      discord?: DiscordContent;
      slack?: SlackContent;
    };
    content_id: string | undefined;
    requires_approval: boolean;
  }> {
    const content: {
      twitter?: TwitterContent;
      linkedin?: LinkedInContent;
      discord?: DiscordContent;
      slack?: SlackContent;
    } = {};

    if (job.platforms.includes('twitter')) {
      content.twitter = this.generateTwitter(job);
    }
    if (job.platforms.includes('linkedin')) {
      content.linkedin = this.generateLinkedIn(job);
    }
    if (job.platforms.includes('discord')) {
      content.discord = this.generateDiscord(job);
    }
    if (job.platforms.includes('slack')) {
      content.slack = this.generateSlack(job);
    }

    // Store in database
    const { data } = await this.supabase
      .from('generated_content')
      .insert({
        event_type: job.event_type,
        source_data: job.source_data,
        content,
        platforms: job.platforms,
        status: job.requires_approval ? 'pending_approval' : 'approved',
        created_at: new Date().toISOString(),
      })
      .select();

    return {
      content,
      content_id: data?.[0]?.id as string | undefined,
      requires_approval: job.requires_approval ?? true,
    };
  }

  private generateTwitter(job: ContentJob): TwitterContent {
    const title = job.source_data.title;
    const agents = job.source_data.agents_involved.join(', ');
    return {
      threads: [`✨ ${title}\n\nAgents: ${agents}\n\n🚀 #Opsly #AI #DevOps`],
      hashtags: ['#Opsly', '#AI', '#DevOps'],
    };
  }

  private generateLinkedIn(job: ContentJob): LinkedInContent {
    return {
      title: job.source_data.title,
      body: job.source_data.description,
      tags: ['AI', 'DevOps', 'Automation'],
    };
  }

  private generateDiscord(job: ContentJob): DiscordContent {
    return {
      content: `🎉 ${job.source_data.title}`,
      embeds: [
        {
          title: job.source_data.title,
          description: job.source_data.description,
          color: 0x00ff00,
        },
      ],
    };
  }

  private generateSlack(job: ContentJob): SlackContent {
    return {
      text: `*${job.source_data.title}*\n${job.source_data.description}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${job.source_data.title}*`,
          },
        },
      ],
    };
  }
}

export const syraGenerator = new SyraContentGenerator();
