import {
  createConversationalRuntime,
  createGatewayTranscriptionPort,
  type ConversationalRuntime,
} from '@intcloudsysops/conversational-runtime';
import type { AiProviderKind } from '@intcloudsysops/opsly-core';
import { peskidsTenantConfig } from '../config/tenant.config';

let cached: ConversationalRuntime | null = null;

function resolveAiProvider(): AiProviderKind {
  if (process.env.GEMINI_API_KEY?.trim()) {
    return 'gemini';
  }
  return 'mock';
}

export function getPeskidsShadowRuntime(): ConversationalRuntime {
  if (cached) {
    return cached;
  }

  const gatewayUrl =
    process.env.LLM_GATEWAY_URL?.trim() || process.env.NEXT_PUBLIC_LLM_GATEWAY_URL?.trim();

  cached = createConversationalRuntime({
    tenants: [peskidsTenantConfig],
    aiProvider: resolveAiProvider(),
    geminiApiKey: process.env.GEMINI_API_KEY,
    ports: {
      transcription: gatewayUrl ? createGatewayTranscriptionPort({ baseUrl: gatewayUrl }) : undefined,
      logger: {
        info(message, context) {
          console.log(JSON.stringify({ level: 'info', service: 'peskids-shadow', message, ...context }));
        },
        error(message, context) {
          console.error(JSON.stringify({ level: 'error', service: 'peskids-shadow', message, ...context }));
        },
      },
    },
  });

  return cached;
}
