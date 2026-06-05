import type { TenantConfig } from '@intcloudsysops/opsly-core';

export interface LlmCompletionRequest {
  tenantSlug: string;
  systemPrompt: string;
  userPrompt: string;
  requestId: string;
}

export interface LlmPort {
  complete(request: LlmCompletionRequest): Promise<string>;
}

export interface TranscriptionRequest {
  tenantSlug: string;
  mediaUrl: string;
  mediaType: 'audio' | 'image';
  requestId: string;
}

export interface TranscriptionPort {
  processText(text: string): Promise<string>;
  processAudio(request: TranscriptionRequest): Promise<string>;
  processImage(request: TranscriptionRequest): Promise<string>;
}

export interface EventSinkPort {
  emit(eventType: string, tenantSlug: string, payload: Record<string, unknown>): Promise<void>;
}

export interface MemoryPort {
  persistConversation(input: {
    tenantSlug: string;
    sender?: string;
    channel: string;
    rawInput: string;
    intent?: string;
    entities?: Record<string, unknown>;
    opslyEvents?: readonly Record<string, unknown>[];
  }): Promise<void>;
}

export interface RuntimeLogger {
  info(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export interface ConversationalRuntimePorts {
  llm?: LlmPort;
  transcription?: TranscriptionPort;
  eventSink?: EventSinkPort;
  memory?: MemoryPort;
  logger?: RuntimeLogger;
}

export type TenantRuntimeBundle = {
  config: TenantConfig;
  ports?: ConversationalRuntimePorts;
};
