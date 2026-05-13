import type { LlmProviderHint } from './types.js';

export function parseProviderHintBody(raw: unknown): LlmProviderHint | undefined {
  if (raw === 'deepseek' || raw === 'nvidia' || raw === 'groq') {
    return raw;
  }
  return undefined;
}
