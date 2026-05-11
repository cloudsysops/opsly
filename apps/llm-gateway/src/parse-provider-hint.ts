import type { LlmProviderHint } from './types.js';

export function parseProviderHintBody(raw: unknown): LlmProviderHint | undefined {
  if (raw === 'deepseek' || raw === 'nvidia') {
    return raw;
  }
  return undefined;
}
