import { VoiceTranscription, SpeakerRole } from '../types.js';

interface TranscriptionServiceConfig {
  supabaseUrl: string;
  supabaseKey: string;
}

export class TranscriptionService {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(config: TranscriptionServiceConfig) {
    this.supabaseUrl = config.supabaseUrl;
    this.supabaseKey = config.supabaseKey;
  }

  async createTranscription(transcription: VoiceTranscription): Promise<VoiceTranscription> {
    const response = await fetch(`${this.supabaseUrl}/rest/v1/voice_transcriptions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.supabaseKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: JSON.stringify({
        id: transcription.id,
        tenant_id: transcription.tenantId,
        call_id: transcription.callId,
        speaker_role: transcription.speakerRole,
        transcript_text: transcription.transcriptText,
        confidence: transcription.confidence,
        timestamp: transcription.timestamp?.toISOString(),
        created_at: transcription.createdAt.toISOString(),
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create transcription: ${response.statusText}`);
    }

    return transcription;
  }

  async getTranscription(tenantId: string, transcriptionId: string): Promise<VoiceTranscription | null> {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/voice_transcriptions?id=eq.${transcriptionId}&tenant_id=eq.${tenantId}`,
      {
        headers: {
          Authorization: `Bearer ${this.supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch transcription: ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>[];
    if (data.length === 0) {
      return null;
    }

    return this.mapDbToTranscription(data[0]);
  }

  async getTranscriptionsByCall(tenantId: string, callId: string): Promise<VoiceTranscription[]> {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/voice_transcriptions?call_id=eq.${callId}&tenant_id=eq.${tenantId}&order=timestamp.asc`,
      {
        headers: {
          Authorization: `Bearer ${this.supabaseKey}`,
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to fetch transcriptions: ${response.statusText}`);
    }

    const data = (await response.json()) as Record<string, unknown>[];
    return data.map((item) => this.mapDbToTranscription(item));
  }

  async updateTranscriptionConfidence(
    tenantId: string,
    transcriptionId: string,
    confidence: number
  ): Promise<VoiceTranscription> {
    const response = await fetch(
      `${this.supabaseUrl}/rest/v1/voice_transcriptions?id=eq.${transcriptionId}&tenant_id=eq.${tenantId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.supabaseKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: JSON.stringify({
          confidence,
          updated_at: new Date().toISOString(),
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update transcription: ${response.statusText}`);
    }

    const data = (await response.json()) as unknown[];
    if (data.length === 0) {
      throw new Error('Transcription not found');
    }

    return this.mapDbToTranscription(data[0] as Record<string, unknown>);
  }

  async getCallTranscriptSummary(tenantId: string, callId: string): Promise<string> {
    const transcriptions = await this.getTranscriptionsByCall(tenantId, callId);
    return transcriptions.map((t) => `[${t.speakerRole}]: ${t.transcriptText}`).join('\n');
  }

  private mapDbToTranscription(dbRecord: Record<string, unknown>): VoiceTranscription {
    return {
      id: dbRecord.id as string,
      tenantId: dbRecord.tenant_id as string,
      callId: dbRecord.call_id as string,
      speakerRole: dbRecord.speaker_role as SpeakerRole,
      transcriptText: dbRecord.transcript_text as string,
      confidence: dbRecord.confidence as number | undefined,
      timestamp: dbRecord.timestamp ? new Date(dbRecord.timestamp as string) : undefined,
      createdAt: new Date(dbRecord.created_at as string),
    };
  }
}
