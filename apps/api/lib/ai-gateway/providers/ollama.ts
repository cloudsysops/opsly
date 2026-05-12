import type { ChatMessage } from '../types';
import {
  postOpenAiCompatibleChatCompletions,
  type OpenAiCompatChatBody,
  type OpenAiCompatErr,
  type OpenAiCompatOk,
} from './http-openai-compat';

function resolveOllamaBaseUrl(): string {
  return (process.env.OLLAMA_BASE_URL ?? '').replace(/\/$/, '');
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
 * Ollama expone `/v1/chat/completions` compatible OpenAI.
 */
export async function sendOllamaChatCompletions(
  messages: ChatMessage[],
  opts: {
    model: string;
    temperature: number;
    max_tokens: number;
    timeoutMs: number;
  }
): Promise<OpenAiCompatOk | OpenAiCompatErr> {
  const base = resolveOllamaBaseUrl();
  if (base.length === 0) {
    return { ok: false, status: 503, snippet: 'OLLAMA_BASE_URL is not configured' };
  }

  const headers: Record<string, string> = {};
  const optionalKey = process.env.OLLAMA_API_KEY?.trim();
  if (optionalKey !== undefined && optionalKey.length > 0) {
    headers.Authorization = `Bearer ${optionalKey}`;
  }

  const endpoint = `${base}/v1/chat/completions`;
  return postOpenAiCompatibleChatCompletions(endpoint, headers, buildBody(messages, opts), opts.timeoutMs);
}
