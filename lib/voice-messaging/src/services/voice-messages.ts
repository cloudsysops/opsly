import { VoiceMessage, MessageDirection } from '../types.js';

interface VoiceMessagesServiceConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export class VoiceMessagesService {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(config: VoiceMessagesServiceConfig) {
    this.supabaseUrl = config.supabaseUrl;
    this.supabaseKey = config.supabaseKey;
  }

  async createVoiceMessage(message: VoiceMessage): Promise<VoiceMessage> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        id: message.id,
        tenant_id: message.tenantId,
        sender_contact: message.senderContact,
        sender_name: message.senderName,
        audio_url: message.audioUrl,
        audio_duration_seconds: message.audioDurationSeconds,
        source: message.channel,
        direction: message.direction,
        transcript: message.transcript,
        external_id: message.externalId,
        created_at: message.createdAt.toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create voice message: ${response.statusText}`);
    }

    return message;
  }

  async getVoiceMessage(tenantId: string, messageId: string): Promise<VoiceMessage | null> {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/messages?id=eq.${messageId}&tenant_id=eq.${tenantId}`,
      {
        headers: {
          Authorization: `Bearer ${this.supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch voice message: ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>[];
    if (data.length === 0) {
      return null;
    }

    return this.mapDbToVoiceMessage(data[0]);
  }

  async updateVoiceMessageTranscript(
    tenantId: string,
    messageId: string,
    transcript: string,
    confidence?: number
  ): Promise<VoiceMessage> {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/messages?id=eq.${messageId}&tenant_id=eq.${tenantId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          transcript,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update voice message: ${response.statusText}`);
    }

    const data = (await response.json()) as unknown[];
    if (data.length === 0) {
      throw new Error('Voice message not found');
    }

    return this.mapDbToVoiceMessage(data[0] as Record<string, unknown>);
  }

  async getVoiceMessagesByContact(
    tenantId: string,
    contact: string,
    limit = 50
  ): Promise<VoiceMessage[]> {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/messages?tenant_id=eq.${tenantId}&sender_contact=eq.${contact}&order=created_at.desc&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${this.supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch voice messages: ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>[];
    return data.map((item) => this.mapDbToVoiceMessage(item));
  }

  async getVoiceMessagesByTenant(tenantId: string, limit = 50): Promise<VoiceMessage[]> {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/messages?tenant_id=eq.${tenantId}&audio_url=not.is.null&order=created_at.desc&limit=${limit}`,
      {
        headers: {
          Authorization: `Bearer ${this.supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch voice messages: ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>[];
    return data.map((item) => this.mapDbToVoiceMessage(item));
  }

  private mapDbToVoiceMessage(dbRecord: Record<string, unknown>): VoiceMessage {
    return {
      id: dbRecord.id as string,
      tenantId: dbRecord.tenant_id as string,
      senderContact: dbRecord.sender_contact as string,
      senderName: dbRecord.sender_name as string,
      audioUrl: dbRecord.audio_url as string,
      audioDurationSeconds: dbRecord.audio_duration_seconds as number,
      channel: dbRecord.source as 'whatsapp' | 'telegram' | 'web',
      transcript: dbRecord.transcript as string | undefined,
      transcriptConfidence: dbRecord.transcript_confidence as number | undefined,
      direction: dbRecord.direction as MessageDirection,
      externalId: dbRecord.external_id as string | undefined,
      createdAt: new Date(dbRecord.created_at as string),
    };
  }
}
