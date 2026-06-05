import {
  Call,
  VoiceMessage,
  VoiceTranscription,
  CallWebhookPayload,
  VoiceMessageWebhookPayload,
  TranscriptionWebhookPayload,
  InitiateCallOptions,
  RecordVoiceMessageOptions,
  TranscribeCallOptions,
} from '../types.js';
import { BaseVoiceProvider } from './index.js';

export class TwilioVoiceProvider extends BaseVoiceProvider {
  provider = 'twilio';
  private accountSid: string;
  private authToken: string;
  private twilioPhoneNumber: string;
  private apiBaseUrl = 'https://api.twilio.com/2010-04-01';

  constructor(config: Record<string, unknown>) {
    super();
    this.accountSid = config.accountSid as string;
    this.authToken = config.authToken as string;
    this.twilioPhoneNumber = config.twilioPhoneNumber as string;

    if (!this.accountSid || !this.authToken) {
      throw new Error('Missing Twilio credentials: accountSid, authToken');
    }
  }

  async initiateCall(options: InitiateCallOptions): Promise<Call> {
    const { tenantId, from, to, channel, webhookUrl } = options;

    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const callResponse = await fetch(`${this.apiBaseUrl}/Accounts/${this.accountSid}/Calls.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        From: this.twilioPhoneNumber,
        To: to,
        Url: webhookUrl,
        Record: 'true',
        RecordingStatusCallback: webhookUrl,
      }).toString(),
    });

    if (!callResponse.ok) {
      throw new Error(`Failed to initiate call: ${callResponse.statusText}`);
    }

    const data = (await callResponse.json()) as {
      sid: string;
      from: string;
      to: string;
      status: string;
      date_created: string;
    };

    return {
      id: data.sid,
      tenantId,
      callId: data.sid,
      initiatorContact: from,
      recipientContact: to,
      channel,
      callState: 'ringing',
      createdAt: new Date(data.date_created),
    };
  }

  async endCall(tenantId: string, callId: string): Promise<void> {
    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const response = await fetch(
      `${this.apiBaseUrl}/Accounts/${this.accountSid}/Calls/${callId}.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ Status: 'completed' }).toString(),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to end call: ${response.statusText}`);
    }
  }

  async recordVoiceMessage(options: RecordVoiceMessageOptions): Promise<VoiceMessage> {
    const { tenantId, senderContact, senderName, audioBlob, channel } = options;

    // Upload audio to Twilio
    const audioUrl = await this.uploadAudio(audioBlob);
    const duration = await this.getAudioDuration(audioBlob);

    return {
      id: crypto.randomUUID(),
      tenantId,
      senderContact,
      senderName,
      audioUrl,
      audioDurationSeconds: duration,
      channel,
      direction: 'inbound',
      createdAt: new Date(),
    };
  }

  async transcribeCall(options: TranscribeCallOptions): Promise<VoiceTranscription> {
    const { tenantId, callId, audioUrl } = options;

    const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

    const transcribeResponse = await fetch(
      `${this.apiBaseUrl}/Accounts/${this.accountSid}/Transcriptions.json`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ RecordingUrl: audioUrl }).toString(),
      }
    );

    if (!transcribeResponse.ok) {
      throw new Error(`Failed to transcribe call: ${transcribeResponse.statusText}`);
    }

    const data = (await transcribeResponse.json()) as { sid: string };

    return {
      id: data.sid,
      tenantId,
      callId,
      speakerRole: 'caller',
      transcriptText: '',
      createdAt: new Date(),
    };
  }

  async handleCallStateWebhook(payload: Record<string, unknown>): Promise<Call> {
    const typedPayload = payload as unknown as CallWebhookPayload;

    return {
      id: typedPayload.callId,
      tenantId: typedPayload.tenantId,
      callId: typedPayload.externalCallId,
      initiatorContact: typedPayload.from,
      recipientContact: typedPayload.to,
      channel: typedPayload.channel,
      callState: typedPayload.state,
      startedAt: typedPayload.startedAt ? new Date(typedPayload.startedAt) : undefined,
      endedAt: typedPayload.endedAt ? new Date(typedPayload.endedAt) : undefined,
      durationSeconds: typedPayload.durationSeconds,
      recordingUrl: typedPayload.recordingUrl,
      recordingId: typedPayload.recordingId,
      createdAt: new Date(),
    };
  }

  async handleVoiceMessageWebhook(payload: Record<string, unknown>): Promise<VoiceMessage> {
    const typedPayload = payload as unknown as VoiceMessageWebhookPayload;

    return {
      id: typedPayload.externalId || crypto.randomUUID(),
      tenantId: typedPayload.tenantId,
      senderContact: typedPayload.senderContact,
      senderName: typedPayload.senderName,
      audioUrl: typedPayload.audioUrl,
      audioDurationSeconds: typedPayload.audioDurationSeconds,
      channel: typedPayload.channel,
      direction: typedPayload.direction,
      externalId: typedPayload.externalId,
      createdAt: new Date(typedPayload.timestamp),
    };
  }

  async handleTranscriptionWebhook(payload: Record<string, unknown>): Promise<VoiceTranscription> {
    const typedPayload = payload as unknown as TranscriptionWebhookPayload;

    return {
      id: crypto.randomUUID(),
      tenantId: typedPayload.tenantId,
      callId: typedPayload.callId,
      speakerRole: typedPayload.speakerRole,
      transcriptText: typedPayload.transcript,
      confidence: typedPayload.confidence,
      createdAt: new Date(),
    };
  }

  async validateCredentials(): Promise<boolean> {
    try {
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');
      const response = await fetch(
        `${this.apiBaseUrl}/Accounts/${this.accountSid}.json`,
        {
          headers: {
            Authorization: `Basic ${auth}`,
          },
        }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  private async uploadAudio(blob: Blob): Promise<string> {
    // Placeholder: In production, upload to S3 or Supabase Storage
    // For now, generate a mock URL
    return `https://recordings.twilio.com/${crypto.randomUUID()}.wav`;
  }

  private async getAudioDuration(blob: Blob): Promise<number> {
    // Placeholder: Extract duration from audio blob metadata
    // For now, return estimated duration
    return Math.round(blob.size / 16000);
  }
}
