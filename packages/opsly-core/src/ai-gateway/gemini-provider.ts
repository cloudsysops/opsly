import type { AiGateway } from './gateway.js';
import type { IntentRequest, ParsedIntent, TenantConfig } from '../types/index.js';
import { createMockGateway } from './mock-provider.js';

export interface GeminiGatewayOptions {
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{ text?: string }>;
    };
  }>;
}

function buildPrompt(request: IntentRequest, tenant: TenantConfig): string {
  const intents = tenant.allowedIntents
    .map((name) => {
      const def = tenant.intents[name];
      return `- ${name}: ${def.description}`;
    })
    .join('\n');

  return [
    'Parse the user utterance into one allowed intent and a JSON payload.',
    'Respond ONLY with JSON: {"intent":"INTENT_NAME","payload":{},"confidence":0.0}',
    `Allowed intents for tenant ${tenant.slug}:`,
    intents,
    `Utterance: ${request.utterance}`,
  ].join('\n');
}

function parseGeminiJson(text: string): ParsedIntent | null {
  const trimmed = text.trim();
  const jsonStart = trimmed.indexOf('{');
  const jsonEnd = trimmed.lastIndexOf('}');
  if (jsonStart < 0 || jsonEnd <= jsonStart) {
    return null;
  }

  const parsed = JSON.parse(trimmed.slice(jsonStart, jsonEnd + 1)) as {
    intent?: string;
    payload?: Record<string, unknown>;
    confidence?: number;
  };

  if (!parsed.intent || typeof parsed.intent !== 'string') {
    return null;
  }

  return {
    intent: parsed.intent,
    payload: parsed.payload ?? {},
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.75,
  };
}

export function createGeminiGateway(options: GeminiGatewayOptions = {}): AiGateway {
  const model = options.model ?? 'gemini-2.0-flash';
  const fetchImpl = options.fetchImpl ?? fetch;
  const fallback = createMockGateway();

  return {
    kind: 'gemini',
    async parseIntent(
      request: IntentRequest,
      tenant: TenantConfig,
    ): Promise<ParsedIntent | null> {
      const apiKey = options.apiKey ?? process.env.GEMINI_API_KEY?.trim();
      if (!apiKey) {
        return fallback.parseIntent(request, tenant);
      }

      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

      const response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: buildPrompt(request, tenant) }] }],
        }),
      });

      if (!response.ok) {
        return null;
      }

      const body = (await response.json()) as GeminiResponse;
      const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        return null;
      }

      try {
        return parseGeminiJson(text);
      } catch {
        return null;
      }
    },
  };
}
