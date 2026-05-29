import type { TranscriptionPort, TranscriptionRequest } from '../ports.js';

export interface GatewayTranscriptionOptions {
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

function gatewayBaseUrl(override?: string): string {
  const raw =
    override?.trim() ||
    process.env.LLM_GATEWAY_URL?.trim() ||
    process.env.NEXT_PUBLIC_LLM_GATEWAY_URL?.trim() ||
    'http://127.0.0.1:3010';
  return raw.replace(/\/$/, '');
}

async function callTranscribe(
  options: GatewayTranscriptionOptions,
  request: TranscriptionRequest,
): Promise<string> {
  const base = gatewayBaseUrl(options.baseUrl);
  const fetchImpl = options.fetchImpl ?? fetch;

  const response = await fetchImpl(`${base}/v1/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tenant_slug: request.tenantSlug,
      request_id: request.requestId,
      media_url: request.mediaUrl,
      media_type: request.mediaType,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const body = (await response.json()) as {
    ok?: boolean;
    text?: string;
    message?: string;
  };

  if (!response.ok || !body.ok || !body.text) {
    const detail = body.message ?? `gateway_transcribe_http_${response.status}`;
    throw new Error(detail);
  }

  return body.text.trim();
}

/** Routes audio/image URLs through llm-gateway `POST /v1/transcribe` (Gemini multimodal). */
export function createGatewayTranscriptionPort(
  options: GatewayTranscriptionOptions = {},
): TranscriptionPort {
  return {
    async processText(text: string): Promise<string> {
      return text.trim();
    },
    async processAudio(request: TranscriptionRequest): Promise<string> {
      return callTranscribe(options, { ...request, mediaType: 'audio' });
    },
    async processImage(request: TranscriptionRequest): Promise<string> {
      return callTranscribe(options, { ...request, mediaType: 'image' });
    },
  };
}
