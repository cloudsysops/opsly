import type { RouteContext } from '../router.js';
import type { Channel, CallState, SpeakerRole } from '@intcloudsysops/voice-messaging';
import {
  verifyPlatformAdminToken,
  parseBody,
  assertTenantSlugOrThrow,
  randomUUID,
} from '../utils.js';
import { jsonResponse, errorResponse } from '../router.js';
import { VoiceServiceLayer } from '../../services/voice-service.js';

let voiceService: VoiceServiceLayer | null = null;

async function getVoiceService(): Promise<VoiceServiceLayer> {
  if (!voiceService) {
    voiceService = new VoiceServiceLayer();
  }
  return voiceService;
}

export async function handleInitiateCall(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }

  let body: unknown;
  try {
    body = await parseBody(ctx.req);
  } catch {
    errorResponse(ctx.res, 400, 'Invalid JSON');
    return;
  }

  if (typeof body !== 'object' || body === null) {
    errorResponse(ctx.res, 400, 'invalid body');
    return;
  }

  const b = body as Record<string, unknown>;
  const tenantId = typeof b.tenant_id === 'string' ? b.tenant_id.trim() : '';
  const from = typeof b.from === 'string' ? b.from.trim() : '';
  const to = typeof b.to === 'string' ? b.to.trim() : '';
  const channel = typeof b.channel === 'string' ? b.channel.trim() : '';
  const webhookUrl = typeof b.webhook_url === 'string' ? b.webhook_url.trim() : '';

  if (!tenantId || !from || !to || !channel) {
    errorResponse(ctx.res, 400, 'tenant_id, from, to, channel required');
    return;
  }

  try {
    assertTenantSlugOrThrow(tenantId);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  const validChannels: Channel[] = ['whatsapp', 'telegram', 'web'];
  if (!validChannels.includes(channel as Channel)) {
    errorResponse(ctx.res, 400, 'channel must be whatsapp, telegram, or web');
    return;
  }

  try {
    const service = await getVoiceService();
    const call = await service.initiateCall({
      tenantId,
      from,
      to,
      channel: channel as Channel,
      webhookUrl,
    });
    jsonResponse(ctx.res, 202, { ok: true, data: call });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleListCalls(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }

  const tenantId = typeof ctx.query.tenant_id === 'string' ? ctx.query.tenant_id.trim() : '';

  if (!tenantId) {
    errorResponse(ctx.res, 400, 'tenant_id query param required');
    return;
  }

  try {
    assertTenantSlugOrThrow(tenantId);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  try {
    const service = await getVoiceService();
    const calls = await service.listCalls(tenantId);
    jsonResponse(ctx.res, 200, { ok: true, data: calls });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleGetCallDetails(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }

  const tenantId = typeof ctx.query.tenant_id === 'string' ? ctx.query.tenant_id.trim() : '';
  const callId = ctx.params['callId'] ?? '';

  if (!tenantId || !callId) {
    errorResponse(ctx.res, 400, 'tenant_id query param and callId path param required');
    return;
  }

  try {
    assertTenantSlugOrThrow(tenantId);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  try {
    const service = await getVoiceService();
    const call = await service.getCall(tenantId, callId);
    if (!call) {
      errorResponse(ctx.res, 404, 'call not found');
      return;
    }
    jsonResponse(ctx.res, 200, { ok: true, data: call });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleUpdateCallState(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }

  let body: unknown;
  try {
    body = await parseBody(ctx.req);
  } catch {
    errorResponse(ctx.res, 400, 'Invalid JSON');
    return;
  }

  if (typeof body !== 'object' || body === null) {
    errorResponse(ctx.res, 400, 'invalid body');
    return;
  }

  const b = body as Record<string, unknown>;
  const tenantId = typeof b.tenant_id === 'string' ? b.tenant_id.trim() : '';
  const callStateStr = typeof b.call_state === 'string' ? b.call_state.trim() : '';
  const durationSeconds = typeof b.duration_seconds === 'number' ? b.duration_seconds : undefined;
  const recordingUrl = typeof b.recording_url === 'string' ? b.recording_url.trim() : undefined;
  const callId = ctx.params['callId'] ?? '';

  if (!tenantId || !callId || !callStateStr) {
    errorResponse(ctx.res, 400, 'tenant_id, callId, call_state required');
    return;
  }

  const validStates: CallState[] = ['ringing', 'connected', 'hold', 'ended', 'failed'];
  if (!validStates.includes(callStateStr as CallState)) {
    errorResponse(
      ctx.res,
      400,
      'call_state must be one of: ringing, connected, hold, ended, failed'
    );
    return;
  }

  try {
    assertTenantSlugOrThrow(tenantId);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  try {
    const service = await getVoiceService();
    const updatedCall = await service.updateCallState(tenantId, callId, {
      callState: callStateStr as CallState,
      durationSeconds,
      recordingUrl,
    });
    jsonResponse(ctx.res, 200, { ok: true, data: updatedCall });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleRecordVoiceMessage(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }

  let body: unknown;
  try {
    body = await parseBody(ctx.req);
  } catch {
    errorResponse(ctx.res, 400, 'Invalid JSON');
    return;
  }

  if (typeof body !== 'object' || body === null) {
    errorResponse(ctx.res, 400, 'invalid body');
    return;
  }

  const b = body as Record<string, unknown>;
  const tenantId = typeof b.tenant_id === 'string' ? b.tenant_id.trim() : '';
  const senderContact = typeof b.sender_contact === 'string' ? b.sender_contact.trim() : '';
  const senderName = typeof b.sender_name === 'string' ? b.sender_name.trim() : '';
  const audioUrl = typeof b.audio_url === 'string' ? b.audio_url.trim() : '';
  const channelStr = typeof b.channel === 'string' ? b.channel.trim() : '';
  const audioDurationSeconds =
    typeof b.audio_duration_seconds === 'number' ? b.audio_duration_seconds : 0;

  if (!tenantId || !senderContact || !audioUrl || !channelStr) {
    errorResponse(ctx.res, 400, 'tenant_id, sender_contact, audio_url, channel required');
    return;
  }

  const validChannels: Channel[] = ['whatsapp', 'telegram', 'web'];
  if (!validChannels.includes(channelStr as Channel)) {
    errorResponse(ctx.res, 400, 'channel must be whatsapp, telegram, or web');
    return;
  }

  try {
    assertTenantSlugOrThrow(tenantId);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  try {
    const service = await getVoiceService();
    const message = await service.recordVoiceMessage({
      tenantId,
      senderContact,
      senderName,
      audioUrl,
      channel: channelStr as Channel,
      audioDurationSeconds,
    });
    jsonResponse(ctx.res, 201, { ok: true, data: message });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleGetVoiceMessage(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }

  const tenantId = typeof ctx.query.tenant_id === 'string' ? ctx.query.tenant_id.trim() : '';
  const messageId = ctx.params['messageId'] ?? '';

  if (!tenantId || !messageId) {
    errorResponse(ctx.res, 400, 'tenant_id query param and messageId path param required');
    return;
  }

  try {
    assertTenantSlugOrThrow(tenantId);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  try {
    const service = await getVoiceService();
    const message = await service.getVoiceMessage(tenantId, messageId);
    if (!message) {
      errorResponse(ctx.res, 404, 'message not found');
      return;
    }
    jsonResponse(ctx.res, 200, { ok: true, data: message });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleSubmitTranscription(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }

  let body: unknown;
  try {
    body = await parseBody(ctx.req);
  } catch {
    errorResponse(ctx.res, 400, 'Invalid JSON');
    return;
  }

  if (typeof body !== 'object' || body === null) {
    errorResponse(ctx.res, 400, 'invalid body');
    return;
  }

  const b = body as Record<string, unknown>;
  const tenantId = typeof b.tenant_id === 'string' ? b.tenant_id.trim() : '';
  const callId = typeof b.call_id === 'string' ? b.call_id.trim() : '';
  const speakerRoleStr = typeof b.speaker_role === 'string' ? b.speaker_role.trim() : '';
  const transcriptText = typeof b.transcript_text === 'string' ? b.transcript_text.trim() : '';
  const confidence = typeof b.confidence === 'number' ? b.confidence : undefined;

  if (!tenantId || !callId || !speakerRoleStr || !transcriptText) {
    errorResponse(ctx.res, 400, 'tenant_id, call_id, speaker_role, transcript_text required');
    return;
  }

  const validRoles: SpeakerRole[] = ['caller', 'recipient', 'assistant'];
  if (!validRoles.includes(speakerRoleStr as SpeakerRole)) {
    errorResponse(ctx.res, 400, 'speaker_role must be one of: caller, recipient, assistant');
    return;
  }

  try {
    assertTenantSlugOrThrow(tenantId);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  try {
    const service = await getVoiceService();
    const transcription = await service.submitTranscription({
      tenantId,
      callId,
      speakerRole: speakerRoleStr as SpeakerRole,
      transcriptText,
      confidence,
    });
    jsonResponse(ctx.res, 201, { ok: true, data: transcription });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}

export async function handleGetTranscriptions(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }

  const tenantId = typeof ctx.query.tenant_id === 'string' ? ctx.query.tenant_id.trim() : '';
  const callId = ctx.params['callId'] ?? '';

  if (!tenantId || !callId) {
    errorResponse(ctx.res, 400, 'tenant_id query param and callId path param required');
    return;
  }

  try {
    assertTenantSlugOrThrow(tenantId);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  try {
    const service = await getVoiceService();
    const transcriptions = await service.getTranscriptions(tenantId, callId);
    jsonResponse(ctx.res, 200, { ok: true, data: transcriptions });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}
