import { randomBytes } from 'node:crypto';
import type { ChatResponse } from './types';

function randomId(): string {
  return randomBytes(8).toString('hex');
}

type UsageShape = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
};

function normalizeUsage(usage: unknown): UsageShape | null {
  if (usage !== null && typeof usage === 'object' && !Array.isArray(usage)) {
    const u = usage as Record<string, unknown>;
    const pt = u.prompt_tokens;
    const ct = u.completion_tokens;
    const tt = u.total_tokens;
    return {
      prompt_tokens: typeof pt === 'number' ? pt : undefined,
      completion_tokens: typeof ct === 'number' ? ct : undefined,
      total_tokens: typeof tt === 'number' ? tt : undefined,
    };
  }
  return null;
}

/**
 * Cuerpo compatible OpenAI `chat.completion` para clientes (OpenCode, SDKs).
 */
export function buildOpenAiChatCompletionPayload(input: {
  /** Modelo que el cliente envió (p. ej. opsly:coding) */
  responseModel: string;
  content: string;
  usage: unknown;
  finish_reason?: string;
}): Record<string, unknown> {
  const usage = normalizeUsage(input.usage);
  return {
    id: `chatcmpl_${randomId()}`,
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: input.responseModel,
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content: input.content },
        finish_reason: input.finish_reason ?? 'stop',
      },
    ],
    ...(usage !== null ? { usage } : {}),
  };
}

export function responseModelForOpenAiClient(req: { model?: string }, out: ChatResponse): string {
  const requested = req.model?.trim() ?? '';
  if (requested.length > 0) {
    return requested;
  }
  if (out.opsly_alias !== undefined && out.opsly_alias !== null && out.opsly_alias.length > 0) {
    return out.opsly_alias;
  }
  return out.model;
}
