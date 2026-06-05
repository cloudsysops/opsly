import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { geminiTranscribeMedia, type GeminiMediaType } from './gemini-transcribe.js';
import { logGatewayEvent } from './structured-log.js';

export interface TranscribeBody {
  tenant_slug: string;
  request_id?: string;
  media_url: string;
  media_type: GeminiMediaType;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      chunks.push(c);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function isMediaType(v: unknown): v is GeminiMediaType {
  return v === 'audio' || v === 'image';
}

function parseBody(raw: string): TranscribeBody | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    return null;
  }
  const body = parsed as Record<string, unknown>;
  const tenant_slug = typeof body.tenant_slug === 'string' ? body.tenant_slug.trim() : '';
  const media_url = typeof body.media_url === 'string' ? body.media_url.trim() : '';
  if (!tenant_slug || !media_url) {
    return null;
  }
  if (!isMediaType(body.media_type)) {
    return null;
  }
  const request_id =
    typeof body.request_id === 'string' && body.request_id.trim().length > 0
      ? body.request_id.trim()
      : undefined;
  return {
    tenant_slug,
    media_url,
    media_type: body.media_type,
    request_id,
  };
}

/** Multimodal transcription via Gemini (audio or image URL). */
export async function handleTranscribeHttp(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const pathOnly = req.url?.split('?')[0] ?? '/';
  if (req.method !== 'POST' || pathOnly !== '/v1/transcribe') {
    return false;
  }

  let bodyRaw: string;
  try {
    bodyRaw = await readBody(req);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid_body' }));
    return true;
  }

  const body = parseBody(bodyRaw);
  if (!body) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid_payload' }));
    return true;
  }

  const request_id = body.request_id ?? randomUUID();
  const start = Date.now();

  try {
    const result = await geminiTranscribeMedia({
      mediaUrl: body.media_url,
      mediaType: body.media_type,
    });

    logGatewayEvent({
      event: 'gateway_transcribe_complete',
      tenant_slug: body.tenant_slug,
      request_id,
      media_type: body.media_type,
      latency_ms: Date.now() - start,
      model_used: result.model,
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        tenant_slug: body.tenant_slug,
        request_id,
        text: result.text,
        model: result.model,
      }),
    );
    return true;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logGatewayEvent({
      event: 'gateway_transcribe_error',
      tenant_slug: body.tenant_slug,
      request_id,
      media_type: body.media_type,
      error: message,
    });
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: false,
        error: 'transcription_failed',
        message,
        request_id,
      }),
    );
    return true;
  }
}
