/**
 * POST chat/completions en endpoints compatibles con OpenAI (NVIDIA, OpenRouter, Ollama, OpenAI).
 * No vuelca cabeceras con secretos; recorta cuerpos de error.
 */

export type OpenAiCompatChatBody = {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  max_tokens: number;
};

type OpenAiCompatResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
};

export type OpenAiCompatOk = {
  ok: true;
  content: string;
  usage: unknown;
  raw: unknown;
  status: number;
};

export type OpenAiCompatErr = {
  ok: false;
  status: number;
  snippet: string;
};

function redactSnippet(text: string): string {
  return text.replace(/sk-[a-zA-Z0-9_-]{10,}/gi, '[redacted]').replace(/nvapi-[a-zA-Z0-9_-]{10,}/gi, '[redacted]');
}

export async function postOpenAiCompatibleChatCompletions(
  endpoint: string,
  headers: Record<string, string>,
  body: OpenAiCompatChatBody,
  timeoutMs: number
): Promise<OpenAiCompatOk | OpenAiCompatErr> {
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  const text = await res.text();
  const snippet = redactSnippet(text.length > 240 ? `${text.slice(0, 240)}…` : text);

  if (!res.ok) {
    return { ok: false, status: res.status, snippet };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, status: res.status, snippet: '[invalid JSON upstream]' };
  }

  const parsed = raw as OpenAiCompatResponse;
  const content = parsed.choices?.[0]?.message?.content ?? '';
  const usage = parsed.usage ?? null;
  return { ok: true, content, usage, raw, status: res.status };
}
