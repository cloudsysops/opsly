import type { AiGatewayProviderId, ChatRequest, ChatResponse } from './types';
import type { ChatMessage } from './types';
import { resolveOpslyRouting } from './router';
import { sendNvidiaChatCompletionsFlexible } from './providers/nvidia';
import { sendOpenrouterChatCompletions } from './providers/openrouter';
import { sendOllamaChatCompletions } from './providers/ollama';
import { sendOpenaiOfficialChatCompletions } from './providers/openai';
import type { OpenAiCompatErr, OpenAiCompatOk } from './providers/http-openai-compat';

const DEFAULT_CHAIN = 'nvidia,openrouter,ollama,openai';

function readTimeoutMs(): number {
  const raw = process.env.AI_GATEWAY_TIMEOUT_MS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(n) && n > 0) {
    return n;
  }
  return 30_000;
}

function readMaxPromptChars(): number {
  const raw = process.env.AI_GATEWAY_MAX_PROMPT_CHARS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(n) && n > 0) {
    return n;
  }
  return 12_000;
}

function readDefaultMaxTokens(): number {
  const raw = process.env.AI_GATEWAY_DEFAULT_MAX_TOKENS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(n) && n > 0) {
    return n;
  }
  return 1024;
}

function readBackoffMs(): number {
  const raw = process.env.AI_GATEWAY_429_BACKOFF_MS?.trim();
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  if (Number.isFinite(n) && n >= 0) {
    return n;
  }
  return 250;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function logUpstreamSafe(provider: string, model: string, status: number, phase: 'upstream' | 'retry'): void {
  console.warn(
    JSON.stringify({
      event: 'ai_gateway_upstream',
      phase,
      provider,
      model,
      status,
    })
  );
}

function validateMessages(messages: ChatRequest['messages'], maxChars: number): void {
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('messages must be a non-empty array');
  }
  let total = 0;
  for (const m of messages) {
    if (m.role !== 'system' && m.role !== 'user' && m.role !== 'assistant') {
      throw new Error('invalid message role');
    }
    if (typeof m.content !== 'string' || m.content.trim().length === 0) {
      throw new Error('each message must have non-empty content');
    }
    total += m.content.length;
  }
  if (total > maxChars) {
    throw new Error(`prompt exceeds maximum length (${maxChars} characters)`);
  }
}

function isProviderId(value: string): value is AiGatewayProviderId {
  return value === 'nvidia' || value === 'openrouter' || value === 'ollama' || value === 'openai';
}

function providerConfigured(p: AiGatewayProviderId): boolean {
  switch (p) {
    case 'nvidia':
      return (process.env.NVIDIA_API_KEY?.trim() ?? '').length > 0;
    case 'openrouter':
      return (process.env.OPENROUTER_API_KEY?.trim() ?? '').length > 0;
    case 'ollama':
      return (process.env.OLLAMA_BASE_URL?.trim() ?? '').length > 0;
    case 'openai':
      return (process.env.OPENAI_API_KEY?.trim() ?? '').length > 0;
    default:
      return false;
  }
}

function parseProviderChain(bucket: string): AiGatewayProviderId[] {
  const envKey = `AI_GATEWAY_PROVIDER_CHAIN_${bucket.toUpperCase()}`;
  const specific = process.env[envKey]?.trim();
  const raw = (specific !== undefined && specific.length > 0 ? specific : process.env.AI_GATEWAY_PROVIDER_CHAIN)
    ?.trim()
    .toLowerCase();
  const source = raw !== undefined && raw.length > 0 ? raw : DEFAULT_CHAIN;
  const parts = source.split(',').map((s) => s.trim().toLowerCase());
  const out: AiGatewayProviderId[] = [];
  for (const p of parts) {
    if (isProviderId(p) && !out.includes(p)) {
      out.push(p);
    }
  }
  return out.length > 0 ? out : (['nvidia'] as AiGatewayProviderId[]);
}

async function dispatchOnce(
  provider: AiGatewayProviderId,
  messages: ChatMessage[],
  upstreamModel: string,
  temperature: number,
  max_tokens: number,
  timeoutMs: number
): Promise<OpenAiCompatOk | OpenAiCompatErr> {
  const opts = { model: upstreamModel, temperature, max_tokens, timeoutMs };
  switch (provider) {
    case 'nvidia':
      return sendNvidiaChatCompletionsFlexible(messages, opts);
    case 'openrouter':
      return sendOpenrouterChatCompletions(messages, opts);
    case 'ollama':
      return sendOllamaChatCompletions(messages, opts);
    case 'openai':
      return sendOpenaiOfficialChatCompletions(messages, opts);
    default:
      return { ok: false, status: 500, snippet: 'unknown provider' };
  }
}

async function callWith429Retry(
  provider: AiGatewayProviderId,
  messages: ChatMessage[],
  upstreamModel: string,
  temperature: number,
  max_tokens: number,
  timeoutMs: number,
  backoffMs: number
): Promise<OpenAiCompatOk | OpenAiCompatErr> {
  let r = await dispatchOnce(provider, messages, upstreamModel, temperature, max_tokens, timeoutMs);
  if (!r.ok && r.status === 429) {
    logUpstreamSafe(provider, upstreamModel, r.status, 'upstream');
    await sleep(backoffMs);
    r = await dispatchOnce(provider, messages, upstreamModel, temperature, max_tokens, timeoutMs);
    if (!r.ok && r.status === 429) {
      logUpstreamSafe(provider, upstreamModel, r.status, 'retry');
    }
  } else if (!r.ok && r.status >= 400) {
    logUpstreamSafe(provider, upstreamModel, r.status, 'upstream');
  }
  return r;
}

/**
 * Punto único servidor→proveedor(es). Reintento corto en 429 y cadena de fallback por env.
 * Los clientes IDE deben usar alias `opsly:*` o ids de modelo; las claves solo en servidor.
 */
export async function runAiGatewayChat(req: ChatRequest): Promise<ChatResponse> {
  const maxChars = readMaxPromptChars();
  validateMessages(req.messages, maxChars);

  const timeoutMs = readTimeoutMs();
  const maxTokens = req.max_tokens ?? readDefaultMaxTokens();
  const temperature = req.temperature ?? 0.2;
  const backoffMs = readBackoffMs();

  const flatMessages = req.messages.map((m) => ({ role: m.role, content: m.content }));
  const routing = resolveOpslyRouting({
    requestedModel: req.model,
    metadata: req.metadata,
    messages: flatMessages,
  });

  const chain = parseProviderChain(routing.effectiveBucket).filter(providerConfigured);
  if (chain.length === 0) {
    throw new Error('No AI providers are configured (set NVIDIA_API_KEY and/or fallback keys)');
  }

  let lastErr: OpenAiCompatErr | null = null;
  for (let i = 0; i < chain.length; i += 1) {
    const provider = chain[i];
    const r = await callWith429Retry(
      provider,
      req.messages,
      routing.upstreamModel,
      temperature,
      maxTokens,
      timeoutMs,
      backoffMs
    );
    if (r.ok) {
      return {
        provider,
        model: routing.upstreamModel,
        content: r.content,
        usage: r.usage,
        raw: r.raw,
        client_model: req.model?.trim() && req.model.trim().length > 0 ? req.model.trim() : null,
        opsly_alias: routing.clientAlias,
      };
    }

    const shouldFallback =
      r.status === 429 || r.status === 503 || r.status === 502 || r.status === 504 || r.status === 408;
    lastErr = r;
    if (!shouldFallback) {
      throw new Error(`${provider} HTTP ${r.status}: ${r.snippet}`);
    }
  }

  const tail = lastErr ?? { ok: false as const, status: 502, snippet: 'no response' };
  throw new Error(`AI gateway exhausted providers (last HTTP ${tail.status})`);
}

export function safeGatewayErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes('NVIDIA_API_KEY') || msg.includes('not configured')) {
      return 'AI gateway is not configured';
    }
    if (msg.includes('HTTP')) {
      return 'Upstream AI provider error';
    }
    if (msg.includes('timeout') || err.name === 'TimeoutError') {
      return 'AI request timed out';
    }
    if (msg.includes('messages') || msg.includes('prompt exceeds')) {
      return msg;
    }
    if (msg.includes('No AI providers')) {
      return 'AI gateway is not configured';
    }
    if (msg.includes('exhausted providers')) {
      return 'Upstream AI provider error';
    }
    return 'AI gateway request failed';
  }
  return 'AI gateway request failed';
}
