/**
 * Contrato OpenAI-style para el AI Gateway interno de la API (Opsly).
 * Las claves de proveedor viven solo en el servidor; ningún cliente debe recibirlas.
 */

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export type ChatRequest = {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  max_tokens?: number;
  metadata?: Record<string, unknown>;
};

export type ChatResponse = {
  provider: string;
  model: string;
  content: string;
  usage?: unknown;
  raw?: unknown;
  /** Modelo pedido por el cliente (alias opsly:* o id), si había */
  client_model?: string | null;
  /** Alias opsly resuelto, si aplica */
  opsly_alias?: string | null;
};

export type AiGatewayProviderId = 'nvidia' | 'openrouter' | 'ollama' | 'openai';
