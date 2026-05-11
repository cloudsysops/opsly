import type { LLMRequest } from './types.js';
import { PROVIDERS, type ProviderChainEntry, type ProviderId } from './providers.js';

function hasDeepseekCredentials(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

function hasNvidiaCredentials(): boolean {
  return Boolean(process.env.NVIDIA_API_KEY?.trim());
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

function nvidiaEntry(): ProviderChainEntry | null {
  if (!hasNvidiaCredentials()) {
    return null;
  }
  return entry('nvidia_nim');
}

function compact(entries: Array<ProviderChainEntry | null>): ProviderChainEntry[] {
  return entries.filter((item): item is ProviderChainEntry => item !== null);
}

/**
 * Orden de proveedores cloud en `llmCallDirect` (después de Ollama local si aplica).
 * - `provider_hint=nvidia`: NVIDIA NIM primero cuando hay API key.
 * - `provider_hint=deepseek`: DeepSeek primero cuando hay API key.
 * - `routing_bias=cost`: NVIDIA NIM → DeepSeek → Haiku → OpenAI mini → OpenRouter.
 * - `balanced` / sin sesgo explícito: Haiku, NVIDIA NIM, DeepSeek, OpenAI mini, OpenRouter.
 * - `quality`: Haiku → OpenAI mini → NVIDIA NIM → OpenRouter → DeepSeek.
 */
export function buildLlmDirectCloudChain(req: LLMRequest): ProviderChainEntry[] {
  const ds = deepseekEntry();
  const nv = nvidiaEntry();
  const haiku = entry('claude_haiku');
  const mini = entry('gpt4o_mini');
  const orCheap = entry('openrouter_cheap');

  if (req.provider_hint === 'nvidia' && nv) {
    return compact([nv, ds, haiku, mini, orCheap]);
  }
  if (req.provider_hint === 'deepseek' && ds) {
    return compact([ds, nv, haiku, mini, orCheap]);
  }
  if (req.routing_bias === 'cost') {
    return compact([nv, ds, haiku, mini, orCheap]);
  }
  if (req.routing_bias === 'quality') {
    return compact([haiku, mini, nv, orCheap, ds]);
  }
  return compact([haiku, nv, ds, mini, orCheap]);
}
