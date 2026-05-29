import {
  CallManager,
  VoiceMessagesService,
  TranscriptionService,
  VoiceProviderFactory,
  type Call,
  type VoiceMessage,
  type VoiceTranscription,
  type Channel,
  type CallState,
  type SpeakerRole,
} from '@intcloudsysops/voice-messaging';

interface InitiateCallOptions {
  tenantId: string;
  from: string;
  to: string;
  channel: Channel;
  webhookUrl: string;
}

interface UpdateCallStateOptions {
  callState: CallState;
  durationSeconds?: number;
  recordingUrl?: string;
}

interface RecordVoiceMessageOptions {
  tenantId: string;
  senderContact: string;
  senderName: string;
  audioUrl: string;
  channel: Channel;
  audioDurationSeconds: number;
}

interface SubmitTranscriptionOptions {
  tenantId: string;
  callId: string;
  speakerRole: SpeakerRole;
  transcriptText: string;
  confidence?: number;
}

export class VoiceServiceLayer {
  private callManager: CallManager;
  private voiceMessagesService: VoiceMessagesService;
  private transcriptionService: TranscriptionService;
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    }

    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;

    // Initialize services
    this.callManager = new CallManager({ supabaseUrl, supabaseKey });
    this.voiceMessagesService = new VoiceMessagesService({ supabaseUrl, supabaseKey });
    this.transcriptionService = new TranscriptionService({ supabaseUrl, supabaseKey });
  }

  async initiateCall(options: InitiateCallOptions): Promise<Call> {
    const { tenantId, from, to, channel, webhookUrl } = options;

    const twilioProvider = VoiceProviderFactory.create('twilio', {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
    });

    const call = await twilioProvider.initiateCall({
      tenantId,
      from,
      to,
      channel,
      webhookUrl,
    });

    await this.callManager.createCall(call);

    return call;
  }

  async listCalls(tenantId: string): Promise<Call[]> {
    return this.callManager.getCallsByTenant(tenantId);
  }

  async getCall(tenantId: string, callId: string): Promise<Call | null> {
    return this.callManager.getCall(tenantId, callId);
  }

  async updateCallState(
    tenantId: string,
    callId: string,
    options: UpdateCallStateOptions
  ): Promise<Call> {
    const { callState } = options;

    return this.callManager.updateCallState(tenantId, callId, callState);
  }

  async recordVoiceMessage(options: RecordVoiceMessageOptions): Promise<VoiceMessage> {
    const { tenantId, senderContact, senderName, audioUrl, channel, audioDurationSeconds } =
      options;

    const voiceMessage: VoiceMessage = {
      id: crypto.randomUUID(),
      tenantId,
      senderContact,
      senderName,
      audioUrl,
      audioDurationSeconds,
      channel,
      direction: 'inbound',
      createdAt: new Date(),
    };

    await this.voiceMessagesService.createVoiceMessage(voiceMessage);

    return voiceMessage;
  }

  async getVoiceMessage(tenantId: string, messageId: string): Promise<VoiceMessage | null> {
    return this.voiceMessagesService.getVoiceMessage(tenantId, messageId);
  }

  async submitTranscription(options: SubmitTranscriptionOptions): Promise<VoiceTranscription> {
    const { tenantId, callId, speakerRole, transcriptText, confidence } = options;

    const transcription: VoiceTranscription = {
      id: crypto.randomUUID(),
      tenantId,
      callId,
      speakerRole,
      transcriptText,
      confidence,
      createdAt: new Date(),
    };

    await this.transcriptionService.createTranscription(transcription);

    return transcription;
  }

  async getTranscriptions(tenantId: string, callId: string): Promise<VoiceTranscription[]> {
    return this.transcriptionService.getTranscriptionsByCall(tenantId, callId);
  }
}
