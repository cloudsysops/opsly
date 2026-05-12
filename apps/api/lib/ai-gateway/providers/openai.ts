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
 * OpenAI oficial (`/v1/chat/completions`). Requiere OPENAI_API_KEY.
 */
export async function sendOpenaiOfficialChatCompletions(
  messages: ChatMessage[],
  opts: {
    model: string;
    temperature: number;
    max_tokens: number;
    timeoutMs: number;
  }
): Promise<OpenAiCompatOk | OpenAiCompatErr> {
  const apiKey = process.env.OPENAI_API_KEY?.trim() ?? '';
  if (apiKey.length === 0) {
    return { ok: false, status: 503, snippet: 'OPENAI_API_KEY is not configured' };
  }

  const base = (process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1').replace(/\/$/, '');
  const endpoint = `${base}/chat/completions`;
  return postOpenAiCompatibleChatCompletions(
    endpoint,
    { Authorization: `Bearer ${apiKey}` },
    buildBody(messages, opts),
    opts.timeoutMs
  );
}
