// Discord API Adapter for Syra

export interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
}

export interface DiscordContent {
  content: string;
  embeds: DiscordEmbed[];
}

export interface DiscordMessage {
  id: string;
  created_at: string;
  channel: string;
}

export class DiscordAdapter {
  private webhookUrl: string;
  private channelId: string;

  constructor(webhookUrl?: string, channelId?: string) {
    this.webhookUrl = webhookUrl || process.env.DISCORD_WEBHOOK_URL || '';
    this.channelId = channelId || process.env.DISCORD_CHANNEL_ID || '';
  }

  async publishMessage(content: DiscordContent): Promise<DiscordMessage | null> {
    if (!this.webhookUrl && !this.channelId) {
      console.warn('⚠️ Discord webhook/channel not configured. Simulating post.');
      return this.simulateMessage(content);
    }

    try {
      if (this.webhookUrl) {
        return await this.postViaWebhook(content);
      }

      console.warn('Discord webhook not configured, using fallback');
      return this.simulateMessage(content);
    } catch (error) {
      console.error('Discord posting failed:', error);
      return this.simulateMessage(content);
    }
  }

  private async postViaWebhook(content: DiscordContent): Promise<DiscordMessage | null> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: content.content,
          embeds: content.embeds.map((embed) => ({
            title: embed.title,
            description: embed.description,
            color: embed.color,
            timestamp: new Date().toISOString(),
          })),
        }),
      });

      if (!response.ok) {
        console.error('Discord webhook error:', response.statusText);
        return null;
      }

      return {
        id: `msg-${Date.now()}`,
        created_at: new Date().toISOString(),
        channel: this.channelId,
      };
    } catch (error) {
      console.error('Discord webhook post failed:', error);
      return null;
    }
  }

  private simulateMessage(_content: DiscordContent): DiscordMessage {
    console.warn('📝 Simulating Discord message (no webhook configured)');
    return {
      id: `sim-discord-${Date.now()}`,
      created_at: new Date().toISOString(),
      channel: this.channelId || 'announcements',
    };
  }

  async getMetrics(_messageId: string): Promise<{ reactions: number; replies: number }> {
    console.warn('Discord metrics: N/A (webhook limitation)');
    return { reactions: 0, replies: 0 };
  }
}

export const discordAdapter = new DiscordAdapter();
