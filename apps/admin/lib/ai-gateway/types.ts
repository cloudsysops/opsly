export type ChatRole = 'system' | 'user' | 'assistant';

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatRequest = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
};

export type ChatResponse = {
  provider: string;
  model: string;
  content: string;
  raw?: unknown;
};

export interface AiGatewayProvider {
  readonly name: string;
  chat(request: ChatRequest): Promise<ChatResponse>;
}

export type AiGatewayProviderName = 'nvidia';

export class AiGatewayError extends Error {
  constructor(
    message: string,
    readonly statusCode = 500
  ) {
    super(message);
    this.name = 'AiGatewayError';
  }
}
