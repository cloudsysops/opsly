import {
  createConversationalRuntime,
  createGatewayTranscriptionPort,
  type ConversationalRuntime,
} from '@intcloudsysops/conversational-runtime';
import type { AiProviderKind } from '@intcloudsysops/opsly-core';
import { paniniLabTenantConfig } from '../config/tenant.config';
import { createPaniniMemoryPort } from './collection';

let cached: ConversationalRuntime | null = null;

function resolveAiProvider(): AiProviderKind {
  if (process.env.GEMINI_API_KEY?.trim()) {
    return 'gemini';
  }
  return 'mock';
}

export function getPaniniRuntime(): ConversationalRuntime {
  if (cached) {
    return cached;
  }

  const gatewayUrl =
    process.env.LLM_GATEWAY_URL?.trim() || process.env.NEXT_PUBLIC_LLM_GATEWAY_URL?.trim();

  cached = createConversationalRuntime({
    tenants: [paniniLabTenantConfig],
    aiProvider: resolveAiProvider(),
    geminiApiKey: process.env.GEMINI_API_KEY,
    ports: {
      memory: createPaniniMemoryPort(),
      transcription: gatewayUrl
        ? createGatewayTranscriptionPort({ baseUrl: gatewayUrl })
        : undefined,
      logger: {
        info(message, context) {
          console.log(JSON.stringify({ level: 'info', message, ...context }));
        },
        error(message, context) {
          console.error(JSON.stringify({ level: 'error', message, ...context }));
        },
      },
    },
  });

  return cached;
}
