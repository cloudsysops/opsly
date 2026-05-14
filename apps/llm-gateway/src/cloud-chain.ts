import type { LLMRequest } from './types.js';
import { PROVIDERS, type ProviderChainEntry, type ProviderId } from './providers.js';

function hasDeepseekCredentials(): boolean {
  return Boolean(process.env.DEEPSEEK_API_KEY?.trim());
}

function hasOpenRouterCredentials(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

function hasNvidiaCredentials(): boolean {
  return Boolean(process.env.NVIDIA_API_KEY?.trim());
}

function hasGroqCredentials(): boolean {
  return Boolean(process.env.GROQ_API_KEY?.trim());
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

function openRouterCheapEntry(): ProviderChainEntry | null {
  if (!hasOpenRouterCredentials()) {
    return null;
  }
  return entry('openrouter_cheap');
}

function nvidiaEntry(): ProviderChainEntry | null {
  if (!hasNvidiaCredentials()) {
    return null;
  }
  return entry('nvidia_chat');
}

function groqEntry(): ProviderChainEntry | null {
  if (!hasGroqCredentials()) {
    return null;
  }
  return entry('groq_chat');
}

/**
 * Orden económico en cloud (tras Ollama local en `llmCallDirect` si aplica):
 * OpenRouter barato → DeepSeek → Groq → NVIDIA (si claves) → Haiku → GPT-4o mini.
 */
function costOrderedCloud(): ProviderChainEntry[] {
  const haiku = entry('claude_haiku');
  const mini = entry('gpt4o_mini');
  const out: ProviderChainEntry[] = [];
  const or = openRouterCheapEntry();
  const ds = deepseekEntry();
  const gq = groqEntry();
  const nv = nvidiaEntry();
  if (or) {
    out.push(or);
  }
  if (ds) {
    out.push(ds);
  }
  if (gq) {
    out.push(gq);
  }
  if (nv) {
    out.push(nv);
  }
  out.push(haiku, mini);
  return out;
}

/**
 * Orden de proveedores cloud en `llmCallDirect` (después de Ollama local si aplica).
 * Prioriza coste bajo / capa gratuita en worker: OpenRouter → DeepSeek → Groq → NVIDIA → Haiku → mini.
 * `provider_hint=deepseek`: DeepSeek primero cuando hay API key.
 * `provider_hint=nvidia`: NVIDIA primero cuando hay API key.
 * `provider_hint=groq`: Groq primero cuando hay API key.
 * `routing_bias=cost`: cadena económica completa (sin hint explícito).
 * `balanced` / sin sesgo explícito: Haiku primero, luego cola económica (sin duplicar Haiku).
 * `quality`: Haiku → mini → OpenRouter → Groq → NVIDIA → DeepSeek al final.
 */
export function buildLlmDirectCloudChain(req: LLMRequest): ProviderChainEntry[] {
  const ds = deepseekEntry();
  const gq = groqEntry();
  const haiku = entry('claude_haiku');
  const mini = entry('gpt4o_mini');
  const orCheap = entry('openrouter_cheap');
  const nv = nvidiaEntry();

  const hintDeepseek = req.provider_hint === 'deepseek';
  const hintNvidia = req.provider_hint === 'nvidia';
  const hintGroq = req.provider_hint === 'groq';
  const bias = req.routing_bias;

  if (hintDeepseek && ds) {
    const tail = costOrderedCloud().filter((e) => e.id !== 'deepseek_chat');
    return [ds, ...tail];
  }
  if (hintNvidia && nv) {
    const tail = costOrderedCloud().filter((e) => e.id !== 'nvidia_chat');
    return [nv, ...tail];
  }
  if (hintGroq && gq) {
    const tail = costOrderedCloud().filter((e) => e.id !== 'groq_chat');
    return [gq, ...tail];
  }
  if (bias === 'cost') {
    return costOrderedCloud();
  }
  if (bias === 'quality') {
    const base = [haiku, mini];
    const tail: ProviderChainEntry[] = [];
    if (hasOpenRouterCredentials()) {
      tail.push(orCheap);
    }
    if (gq) {
      tail.push(gq);
    }
    if (nv) {
      tail.push(nv);
    }
    if (ds) {
      tail.push(ds);
    }
    return [...base, ...tail];
  }
  const cheap = costOrderedCloud();
  if (ds) {
    return [haiku, ...cheap.filter((e) => e.id !== 'claude_haiku')];
  }
  return [haiku, ...cheap.filter((e) => e.id !== 'claude_haiku')];
}
