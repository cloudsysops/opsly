import { PROVIDERS, type ProviderChainEntry } from './providers.js';
import type { LLMRequest } from './types.js';

function chainEntry(id: keyof typeof PROVIDERS): ProviderChainEntry {
  return {
    id,
    healthKey: PROVIDERS[id].healthKey,
    def: PROVIDERS[id],
  };
}

/**
 * Orden de proveedores cloud para `llmCallDirect` (sin filtrar por health).
 * DeepSeek solo entra si existe `DEEPSEEK_API_KEY` y la petición pide sesgo coste,
 * calidad, o hint explícito.
 */
export function buildLlmDirectCloudChain(req: LLMRequest): ProviderChainEntry[] {
  const base: ProviderChainEntry[] = [
    chainEntry('claude_haiku'),
    chainEntry('gpt4o_mini'),
    chainEntry('openrouter_cheap'),
  ];

  const deepseekKey = process.env.DEEPSEEK_API_KEY ?? '';
  if (deepseekKey.length === 0) {
    return base;
  }

  const useDeepseek =
    req.provider_hint === 'deepseek' ||
    req.routing_bias === 'cost' ||
    req.routing_bias === 'quality';
  if (!useDeepseek) {
    return base;
  }

  const deepseek = chainEntry('deepseek_chat');

  if (req.routing_bias === 'quality') {
    return [...base, deepseek];
  }

  return [deepseek, ...base];
}
