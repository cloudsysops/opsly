import { AiGatewayError, type AiGatewayProvider, type ChatRequest, type ChatResponse } from '../types';

const DEFAULT_BASE_URL = 'https://integrate.api.nvidia.com/v1';
const DEFAULT_MODEL = 'meta/llama-3.1-8b-instruct';
const DEFAULT_MAX_TOKENS = 1024;
const DEFAULT_TEMPERATURE = 0.2;
const MIN_TIMEOUT_MS = 1_000;
const MAX_TIMEOUT_MS = 120_000;

type NvidiaChatChoice = {
  message?: {
    content?: unknown;
  };
};

type NvidiaChatResponseBody = {
  model?: unknown;
  choices?: unknown;
};

function envValue(name: string): string | null {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : null;
}

function resolveTimeoutMs(): number {
  const raw = Number(process.env.AI_GATEWAY_TIMEOUT_MS ?? '30000');
  if (!Number.isFinite(raw)) return 30_000;
  return Math.min(MAX_TIMEOUT_MS, Math.max(MIN_TIMEOUT_MS, Math.floor(raw)));
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function safeMaxTokens(value: number | undefined): number {
  if (value === undefined) return DEFAULT_MAX_TOKENS;
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_MAX_TOKENS;
  return Math.min(4096, Math.floor(value));
}

function safeTemperature(value: number | undefined): number {
  if (value === undefined) return DEFAULT_TEMPERATURE;
  if (!Number.isFinite(value)) return DEFAULT_TEMPERATURE;
  return Math.min(2, Math.max(0, value));
}

function parseNvidiaContent(body: NvidiaChatResponseBody): string {
  if (!Array.isArray(body.choices) || body.choices.length === 0) {
    throw new AiGatewayError('NVIDIA returned a malformed response', 502);
  }
  const first = body.choices[0] as NvidiaChatChoice;
  const content = first.message?.content;
  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new AiGatewayError('NVIDIA returned an empty response', 502);
  }
  return content;
}

async function readErrorBody(response: Response): Promise<string> {
  const text = await response.text().catch(() => '');
  if (!text) return `NVIDIA request failed with HTTP ${response.status}`;
  try {
    const parsed = JSON.parse(text) as { error?: { message?: unknown }; message?: unknown };
    const message = parsed.error?.message ?? parsed.message;
    if (typeof message === 'string' && message.trim().length > 0) {
      return `NVIDIA request failed: ${message.slice(0, 300)}`;
    }
  } catch {
    // Fall back to sanitized text below.
  }
  return `NVIDIA request failed with HTTP ${response.status}: ${text.slice(0, 300)}`;
}

export class NvidiaProvider implements AiGatewayProvider {
  readonly name = 'nvidia';

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const apiKey = envValue('NVIDIA_API_KEY');
    if (!apiKey) {
      throw new AiGatewayError('NVIDIA provider is not configured', 500);
    }

    const baseUrl = trimTrailingSlash(envValue('NVIDIA_BASE_URL') ?? DEFAULT_BASE_URL);
    const model = request.model?.trim() || envValue('NVIDIA_DEFAULT_MODEL') || DEFAULT_MODEL;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), resolveTimeoutMs());

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: request.messages,
          temperature: safeTemperature(request.temperature),
          max_tokens: safeMaxTokens(request.max_tokens),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new AiGatewayError(await readErrorBody(response), response.status >= 500 ? 502 : response.status);
      }

      const body = (await response.json().catch(() => null)) as NvidiaChatResponseBody | null;
      if (!body || typeof body !== 'object') {
        throw new AiGatewayError('NVIDIA returned invalid JSON', 502);
      }

      return {
        provider: this.name,
        model: typeof body.model === 'string' && body.model.length > 0 ? body.model : model,
        content: parseNvidiaContent(body),
        raw: body,
      };
    } catch (error) {
      if (error instanceof AiGatewayError) {
        throw error;
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new AiGatewayError('NVIDIA request timed out', 504);
      }
      throw new AiGatewayError('NVIDIA request failed', 502);
    } finally {
      clearTimeout(timeout);
    }
  }
}
