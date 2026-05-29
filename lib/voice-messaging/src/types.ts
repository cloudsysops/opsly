export type CallState = 'ringing' | 'connected' | 'hold' | 'ended' | 'failed';
export type Channel = 'whatsapp' | 'telegram' | 'web';
export type MessageDirection = 'inbound' | 'outbound';
export type SpeakerRole = 'caller' | 'recipient' | 'assistant';

export interface Call {
  id: string;
  tenantId: string;
  callId: string;
  initiatorContact: string;
  recipientContact: string;
  channel: Channel;
  callState: CallState;
  startedAt?: Date;
  endedAt?: Date;
  durationSeconds?: number;
  recordingUrl?: string;
  recordingId?: string;
  createdAt: Date;
}

export interface VoiceMessage {
  id: string;
  tenantId: string;
  senderContact: string;
  senderName: string;
  audioUrl: string;
  audioDurationSeconds: number;
  channel: Channel;
  transcript?: string;
  transcriptConfidence?: number;
  direction: MessageDirection;
  externalId?: string;
  createdAt: Date;
}

export interface VoiceTranscription {
  id: string;
  tenantId: string;
  callId: string;
  speakerRole: SpeakerRole;
  transcriptText: string;
  confidence?: number;
  timestamp?: Date;
  createdAt: Date;
}

export interface CallWebhookPayload {
  tenantId: string;
  callId: string;
  externalCallId: string;
  from: string;
  to: string;
  state: CallState;
  startedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  channel: Channel;
  recordingUrl?: string;
  recordingId?: string;
}

export interface VoiceMessageWebhookPayload {
  tenantId: string;
  senderContact: string;
  senderName: string;
  audioUrl: string;
  audioDurationSeconds: number;
  channel: Channel;
  direction: MessageDirection;
  externalId?: string;
  timestamp: string;
}

export interface TranscriptionWebhookPayload {
  tenantId: string;
  callId: string;
  externalCallId: string;
  transcript: string;
  confidence?: number;
  speakerRole: SpeakerRole;
}

export interface InitiateCallOptions {
  tenantId: string;
  from: string;
  to: string;
  channel: Channel;
  webhookUrl: string;
}

export interface RecordVoiceMessageOptions {
  tenantId: string;
  senderContact: string;
  senderName: string;
  audioBlob: Blob;
  channel: Channel;
  webhookUrl: string;
}

export interface TranscribeCallOptions {
  tenantId: string;
  callId: string;
  externalCallId: string;
  audioUrl: string;
  webhookUrl: string;
}
