import type { ChatMessage } from '../types';
import {
  postOpenAiCompatibleChatCompletions,
  type OpenAiCompatChatBody,
  type OpenAiCompatErr,
  type OpenAiCompatOk,
} from './http-openai-compat';

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
 * OpenRouter (OpenAI-compatible). Requiere OPENROUTER_API_KEY.
 */
export async function sendOpenrouterChatCompletions(
  messages: ChatMessage[],
  opts: {
    model: string;
    temperature: number;
    max_tokens: number;
    timeoutMs: number;
  }
): Promise<OpenAiCompatOk | OpenAiCompatErr> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim() ?? '';
  if (apiKey.length === 0) {
    return { ok: false, status: 503, snippet: 'OPENROUTER_API_KEY is not configured' };
  }

  const referer = process.env.OPENROUTER_HTTP_REFERER?.trim() ?? 'https://opsly.ai';
  const title = process.env.OPENROUTER_APP_TITLE?.trim() ?? 'Opsly AI Gateway';

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': referer,
    'X-Title': title,
  };

  const endpoint = 'https://openrouter.ai/api/v1/chat/completions';
  return postOpenAiCompatibleChatCompletions(endpoint, headers, buildBody(messages, opts), opts.timeoutMs);
}
