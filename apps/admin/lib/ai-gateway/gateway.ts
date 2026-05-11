import { createAiGatewayProvider } from './providers';
import { AiGatewayError, type ChatMessage, type ChatRequest, type ChatResponse } from './types';

const MAX_MESSAGES = 16;
const MAX_PROMPT_CHARS = 12_000;
const DEFAULT_MAX_TOKENS = 1024;
const VALID_ROLES = new Set(['system', 'user', 'assistant']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function parseNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeMessage(value: unknown): ChatMessage {
  if (!isRecord(value)) {
    throw new AiGatewayError('Each message must be an object', 400);
  }
  const role = value.role;
  const content = value.content;
  if (typeof role !== 'string' || !VALID_ROLES.has(role)) {
    throw new AiGatewayError('Invalid message role', 400);
  }
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new AiGatewayError('Message content is required', 400);
  }
  return { role: role as ChatMessage['role'], content: content.trim() };
}

function normalizeRequest(input: unknown): ChatRequest {
  if (!isRecord(input)) {
    throw new AiGatewayError('Request body must be a JSON object', 400);
  }
  const rawMessages = input.messages;
  if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
    throw new AiGatewayError('messages is required', 400);
  }
  if (rawMessages.length > MAX_MESSAGES) {
    throw new AiGatewayError(`Too many messages. Max ${MAX_MESSAGES}`, 400);
  }

  const messages = rawMessages.map(normalizeMessage);
  const totalChars = messages.reduce((sum, message) => sum + message.content.length, 0);
  if (totalChars > MAX_PROMPT_CHARS) {
    throw new AiGatewayError(`Prompt too long. Max ${MAX_PROMPT_CHARS} characters`, 400);
  }

  const model = typeof input.model === 'string' && input.model.trim().length > 0 ? input.model.trim() : undefined;
  const temperature = parseNumber(input.temperature);
  const maxTokens = parseNumber(input.max_tokens) ?? DEFAULT_MAX_TOKENS;

  return {
    messages,
    model,
    temperature,
    max_tokens: Math.min(4096, Math.max(1, Math.floor(maxTokens))),
  };
}

export async function chatWithAiGateway(input: unknown): Promise<ChatResponse> {
  const request = normalizeRequest(input);
  const provider = createAiGatewayProvider();
  console.info('[ai-gateway] chat request', {
    provider: provider.name,
    model: request.model ?? 'default',
    messages: request.messages.length,
    chars: request.messages.reduce((sum, message) => sum + message.content.length, 0),
  });
  return provider.chat(request);
}

export function safeGatewayError(error: unknown): { message: string; statusCode: number } {
  if (error instanceof AiGatewayError) {
    return { message: error.message, statusCode: error.statusCode };
  }
  return { message: 'AI gateway request failed', statusCode: 500 };
}

export type { ChatMessage, ChatRequest, ChatResponse } from './types';
