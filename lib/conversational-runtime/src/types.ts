import type { AgentRuntimeResult, OpslyEvent, Uuid } from '@intcloudsysops/opsly-core';

export type ChannelKind = 'web' | 'whatsapp' | 'telegram' | 'voice';

export type MessageType = 'text' | 'audio_url' | 'image_url';

export interface InputMessage {
  channel: ChannelKind;
  tenantSlug: string;
  sender?: string;
  messageType: MessageType;
  content: string;
  requestId?: Uuid;
}

export interface AgentResponse {
  ok: boolean;
  reply: string;
  traceId: Uuid;
  intent?: string;
  eventIds: readonly Uuid[];
  runtime: AgentRuntimeResult;
  events: readonly OpslyEvent[];
}
