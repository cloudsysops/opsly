import type { LLMRequest } from './types.js';
import { PROVIDERS, type ProviderChainEntry, type ProviderId } from './providers.js';

function hasDeepseekCredentials(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

function entry(id: ProviderId): ProviderChainEntry {
  return {
    id,
    healthKey: PROVIDERS[id].healthKey,
    def: PROVIDERS[id],
  };
}

function deepseekEntry(): ProviderChainEntry | null {
  if (!hasDeepseekCredentials()) {
    return null;
  }
  return entry('deepseek_chat');
}

/**
 * Orden de proveedores cloud en `llmCallDirect` (después de Ollama local si aplica).
 * - `routing_bias=cost` o `provider_hint=deepseek`: DeepSeek primero cuando hay API key.
 * - `balanced`: Haiku, luego DeepSeek, luego OpenAI mini, OpenRouter.
 * - `quality`: Haiku → OpenAI → OpenRouter → DeepSeek (último recurso barato).
 */
export function buildLlmDirectCloudChain(req: LLMRequest): ProviderChainEntry[] {
  const ds = deepseekEntry();
  const haiku = entry('claude_haiku');
  const mini = entry('gpt4o_mini');
  const orCheap = entry('openrouter_cheap');

  const hintDeepseek = req.provider_hint === 'deepseek';
  const bias = req.routing_bias;

  if (hintDeepseek && ds) {
    return [ds, haiku, mini, orCheap];
  }
  if (bias === 'cost' && ds) {
    return [ds, haiku, mini, orCheap];
  }
  if (bias === 'quality') {
    const base = [haiku, mini, orCheap];
    return ds ? [...base, ds] : base;
  }
  if (ds) {
    return [haiku, ds, mini, orCheap];
  }
  return [haiku, mini, orCheap];
}
