// Slack API Adapter for Syra

export interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
}

export interface SlackContent {
  text: string;
  blocks: SlackBlock[];
}

export interface SlackMessage {
  ts: string;
  channel: string;
  created_at: string;
}

export class SlackAdapter {
  private webhookUrl: string;
  private channelId: string;

  constructor(webhookUrl?: string, channelId?: string) {
    this.webhookUrl = webhookUrl || process.env.SLACK_WEBHOOK_URL || '';
    this.channelId = channelId || process.env.SLACK_CHANNEL_ID || 'announcements';
  }

  async publishMessage(content: SlackContent): Promise<SlackMessage | null> {
    if (!this.webhookUrl) {
      console.warn('⚠️ Slack webhook not configured. Simulating post.');
      return this.simulateMessage(content);
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          channel: `#${this.channelId}`,
          text: content.text,
          blocks: content.blocks.map((block) => ({
            type: block.type,
            ...(block.text && {
              text: {
                type: block.text.type || 'mrkdwn',
                text: block.text.text,
              },
            }),
          })),
        }),
      });

      if (!response.ok) {
        console.error('Slack webhook error:', response.statusText);
        return this.simulateMessage(content);
      }

      return {
        ts: `${Date.now()}`,
        channel: this.channelId,
        created_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Slack posting failed:', error);
      return this.simulateMessage(content);
    }
  }

  private simulateMessage(_content: SlackContent): SlackMessage {
    console.warn('📝 Simulating Slack message (no webhook configured)');
    return {
      ts: `${Date.now()}`,
      channel: this.channelId,
      created_at: new Date().toISOString(),
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getMetrics(_messageTs: string): Promise<{ reactions: number; replies: number }> {
    console.warn('Slack metrics: N/A (webhook limitation)');
    return { reactions: 0, replies: 0 };
  }
}

export const slackAdapter = new SlackAdapter();
