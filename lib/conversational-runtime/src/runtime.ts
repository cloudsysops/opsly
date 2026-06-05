import {
  AgentRuntime,
  createOpslyCore,
  newRequestId,
  type AgentRuntimeResult,
  type CreateOpslyCoreOptions,
  type EventLogStore,
  type TenantConfig,
} from '@intcloudsysops/opsly-core';

import type {
  ConversationalRuntimePorts,
  TranscriptionPort,
  TranscriptionRequest,
} from './ports.js';
import type { AgentResponse, InputMessage } from './types.js';

export interface ConversationalRuntimeOptions extends CreateOpslyCoreOptions {
  ports?: ConversationalRuntimePorts;
}

export interface ConversationalRuntime {
  handle(input: InputMessage): Promise<AgentResponse>;
  runtime: AgentRuntime;
  eventLog: EventLogStore;
}

const passthroughTranscription: TranscriptionPort = {
  async processText(text: string): Promise<string> {
    return text;
  },
  async processAudio(request: TranscriptionRequest): Promise<string> {
    return request.mediaUrl;
  },
  async processImage(request: TranscriptionRequest): Promise<string> {
    return request.mediaUrl;
  },
};

function defaultReply(result: AgentRuntimeResult): string {
  if (result.error) {
    return result.error;
  }
  if (!result.event) {
    return 'No event produced.';
  }
  if (result.event.status === 'dispatched') {
    return `Listo. Procesé ${result.event.intent}.`;
  }
  if (result.event.status === 'accepted') {
    return `Recibido (${result.event.intent}). Modo shadow — sin dispatch a producción.`;
  }
  return `Estado: ${result.event.status}.`;
}

export function createConversationalRuntime(
  options: ConversationalRuntimeOptions,
): ConversationalRuntime {
  const { ports, ...coreOptions } = options;
  const core = createOpslyCore(coreOptions);
  const transcription = ports?.transcription ?? passthroughTranscription;
  const logger = ports?.logger;

  return {
    runtime: core.runtime,
    eventLog: core.eventLog,
    async handle(input: InputMessage): Promise<AgentResponse> {
      const traceId = newRequestId(input.requestId);
      let utterance: string;

      try {
        if (input.messageType === 'audio_url') {
          utterance = await transcription.processAudio({
            tenantSlug: input.tenantSlug,
            mediaUrl: input.content,
            mediaType: 'audio',
            requestId: traceId,
          });
        } else if (input.messageType === 'image_url') {
          utterance = await transcription.processImage({
            tenantSlug: input.tenantSlug,
            mediaUrl: input.content,
            mediaType: 'image',
            requestId: traceId,
          });
        } else {
          utterance = await transcription.processText(input.content);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        logger?.error('conversational.transcription.failed', {
          tenantSlug: input.tenantSlug,
          traceId,
          message,
        });
        return {
          ok: false,
          reply: 'No pude procesar el audio o imagen.',
          traceId,
          eventIds: [],
          runtime: { event: null, error: message, code: 'AI_PARSE_FAILED' },
          events: [],
        };
      }

      const runtimeResult = await core.runtime.handle({
        tenantSlug: input.tenantSlug,
        utterance,
        requestId: traceId,
      });

      if (runtimeResult.event && ports?.eventSink) {
        await ports.eventSink.emit(
          `conversational.${runtimeResult.event.intent}`,
          input.tenantSlug,
          {
            channel: input.channel,
            sender: input.sender,
            payload: runtimeResult.event.payload,
            status: runtimeResult.event.status,
          },
        );
      }

      if (ports?.memory && runtimeResult.event) {
        await ports.memory.persistConversation({
          tenantSlug: input.tenantSlug,
          sender: input.sender,
          channel: input.channel,
          rawInput: input.content,
          intent: runtimeResult.event.intent,
          entities: runtimeResult.event.payload as Record<string, unknown>,
          opslyEvents: [runtimeResult.event as unknown as Record<string, unknown>],
        });
      }

      logger?.info('conversational.handle.complete', {
        tenantSlug: input.tenantSlug,
        channel: input.channel,
        traceId,
        intent: runtimeResult.event?.intent,
        code: runtimeResult.code,
      });

      const events = runtimeResult.event ? [runtimeResult.event] : [];

      return {
        ok: !runtimeResult.code,
        reply: defaultReply(runtimeResult),
        traceId,
        intent: runtimeResult.event?.intent,
        eventIds: events.map((event) => event.id),
        runtime: runtimeResult,
        events,
      };
    },
  };
}

export function tenantConfigsFrom(options: {
  tenants: readonly TenantConfig[];
}): readonly TenantConfig[] {
  return options.tenants;
}
