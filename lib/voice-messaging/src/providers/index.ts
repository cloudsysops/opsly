import {
  Call,
  VoiceMessage,
  VoiceTranscription,
  InitiateCallOptions,
  RecordVoiceMessageOptions,
  TranscribeCallOptions,
} from '../types';

export abstract class BaseVoiceProvider {
  abstract provider: string;

  abstract initiateCall(options: InitiateCallOptions): Promise<Call>;

  abstract endCall(tenantId: string, callId: string): Promise<void>;

  abstract recordVoiceMessage(options: RecordVoiceMessageOptions): Promise<VoiceMessage>;

  abstract transcribeCall(options: TranscribeCallOptions): Promise<VoiceTranscription>;

  abstract handleCallStateWebhook(payload: Record<string, unknown>): Promise<Call>;

  abstract handleVoiceMessageWebhook(payload: Record<string, unknown>): Promise<VoiceMessage>;

  abstract handleTranscriptionWebhook(payload: Record<string, unknown>): Promise<VoiceTranscription>;

  abstract validateCredentials(): Promise<boolean>;
}

type VoiceProviderType = 'twilio' | 'vonage';

export class VoiceProviderFactory {
  private static providers: Map<VoiceProviderType, typeof BaseVoiceProvider> = new Map();

  static register(type: VoiceProviderType, providerClass: typeof BaseVoiceProvider) {
    this.providers.set(type, providerClass);
  }

  static create(type: VoiceProviderType, config: Record<string, unknown>): BaseVoiceProvider {
    const ProviderClass = this.providers.get(type);
    if (!ProviderClass) {
      throw new Error(`Unknown voice provider: ${type}`);
    }
    return new ProviderClass(config);
  }

  static isSupported(type: string): boolean {
    return this.providers.has(type as VoiceProviderType);
  }
}

export type { VoiceProviderType };
