import { HTTP_STATUS } from '../constants';
import type { ChatRequest } from './types';

export function isChatMessageArray(value: unknown): value is ChatRequest['messages'] {
  if (!Array.isArray(value) || value.length === 0) {
    return false;
  }
  for (const item of value) {
    if (typeof item !== 'object' || item === null) {
      return false;
    }
    const rec = item as Record<string, unknown>;
    if (rec.role !== 'system' && rec.role !== 'user' && rec.role !== 'assistant') {
      return false;
    }
    if (typeof rec.content !== 'string') {
      return false;
    }
  }
  return true;
}

export type ParsedAiChatBody =
  | {
      ok: true;
      chat: ChatRequest;
      stream: boolean;
    }
  | { ok: false; response: Response };

export function parseAiChatJsonBody(body: Record<string, unknown>): ParsedAiChatBody {
  if (body.stream === true) {
    return {
      ok: false,
      response: Response.json(
        { error: { message: 'stream=true is not supported', type: 'invalid_request_error' } },
        { status: HTTP_STATUS.BAD_REQUEST }
      ),
    };
  }

  const messages = body.messages;
  if (!isChatMessageArray(messages)) {
    return {
      ok: false,
      response: Response.json(
        { error: { message: 'messages must be a non-empty array of { role, content }', type: 'invalid_request_error' } },
        { status: HTTP_STATUS.BAD_REQUEST }
      ),
    };
  }

  const temperature =
    typeof body.temperature === 'number' && Number.isFinite(body.temperature) ? body.temperature : undefined;
  const max_tokens =
    typeof body.max_tokens === 'number' && Number.isFinite(body.max_tokens) && body.max_tokens > 0
      ? body.max_tokens
      : undefined;
  const model = typeof body.model === 'string' ? body.model : undefined;
  const meta =
    typeof body.metadata === 'object' && body.metadata !== null
      ? (body.metadata as Record<string, unknown>)
      : undefined;

  return {
    ok: true,
    stream: false,
    chat: {
      messages,
      temperature,
      max_tokens,
      model,
      metadata: meta,
    },
  };
}
