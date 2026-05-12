import type { ChatMessage } from '../types';
import {
  postOpenAiCompatibleChatCompletions,
  type OpenAiCompatChatBody,
  type OpenAiCompatErr,
  type OpenAiCompatOk,
} from './http-openai-compat';

function resolveNvidiaApiKey(): string {
  return process.env.NVIDIA_API_KEY?.trim() ?? '';
}

export function resolveNvidiaBaseUrl(): string {
  return (process.env.NVIDIA_BASE_URL ?? 'https://integrate.api.nvidia.com/v1').replace(/\/$/, '');
}

export function resolveNvidiaDefaultModel(): string {
  const explicit = process.env.NVIDIA_DEFAULT_MODEL?.trim();
  if (explicit !== undefined && explicit.length > 0) {
    return explicit;
  }
  const legacy = process.env.NVIDIA_MODEL_ID?.trim();
  if (legacy !== undefined && legacy.length > 0) {
    return legacy;
  }
  return 'meta/llama-3.1-8b-instruct';
}

function buildBody(
  messages: ChatMessage[],
  opts: { model: string; temperature: number; max_tokens: number }
): OpenAiCompatChatBody {
  return {
    model: opts.model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature: opts.temperature,
    max_tokens: opts.max_tokens,
  };
}

/**
 * POST OpenAI-compatible chat/completions a NVIDIA Build / NIM.
 * Resultado discriminated para reintentos 429 y fallback en el gateway.
 */
export async function sendNvidiaChatCompletionsFlexible(
  messages: ChatMessage[],
  opts: {
    model: string;
    temperature: number;
    max_tokens: number;
    timeoutMs: number;
  }
): Promise<OpenAiCompatOk | OpenAiCompatErr> {
  const apiKey = resolveNvidiaApiKey();
  if (apiKey.length === 0) {
    return { ok: false, status: 503, snippet: 'NVIDIA_API_KEY is not configured' };
  }

  const base = resolveNvidiaBaseUrl();
  const endpoint = `${base}/chat/completions`;
  const body = buildBody(messages, opts);
  return postOpenAiCompatibleChatCompletions(
    endpoint,
    { Authorization: `Bearer ${apiKey}` },
    body,
    opts.timeoutMs
  );
}

/**
 * POST OpenAI-compatible chat/completions a NVIDIA Build / NIM.
 * Lanza si el upstream no es 2xx (compatibilidad con llamadas legacy).
 */
export async function sendNvidiaChatCompletions(
  messages: ChatMessage[],
  opts: {
    model: string;
    temperature: number;
    max_tokens: number;
    timeoutMs: number;
  }
): Promise<{ content: string; usage: unknown; raw: unknown }> {
  const r = await sendNvidiaChatCompletionsFlexible(messages, opts);
  if (!r.ok) {
    throw new Error(`NVIDIA HTTP ${r.status}: ${r.snippet}`);
  }
  return { content: r.content, usage: r.usage, raw: r.raw };
}
