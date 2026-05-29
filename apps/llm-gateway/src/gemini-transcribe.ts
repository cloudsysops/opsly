const DEFAULT_MODEL = 'gemini-2.0-flash';
const MAX_BYTES = 8 * 1024 * 1024;

export type GeminiMediaType = 'audio' | 'image';

export interface GeminiTranscribeInput {
  mediaUrl: string;
  mediaType: GeminiMediaType;
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

export interface GeminiTranscribeResult {
  text: string;
  model: string;
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

function mimeForMediaType(mediaType: GeminiMediaType, contentType: string | null): string {
  if (contentType && contentType.split(';')[0]?.trim()) {
    return contentType.split(';')[0]?.trim() ?? '';
  }
  return mediaType === 'audio' ? 'audio/mpeg' : 'image/jpeg';
}

function promptForMedia(mediaType: GeminiMediaType): string {
  if (mediaType === 'audio') {
    return [
      'Transcribe the spoken content in this audio.',
      'Respond with plain text only — no markdown, no JSON.',
      'If unclear, give your best guess in Spanish or English.',
    ].join(' ');
  }
  return [
    'Describe any sticker numbers, album text, or collection details visible in this image.',
    'Respond with plain text only — no markdown, no JSON.',
    'Include numbers you can read (e.g. figurita 45).',
  ].join(' ');
}

export async function geminiTranscribeMedia(
  input: GeminiTranscribeInput,
): Promise<GeminiTranscribeResult> {
  const apiKey = input.apiKey ?? process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no configurada');
  }

  const model = input.model ?? process.env.GEMINI_MODEL?.trim() ?? DEFAULT_MODEL;
  const fetchImpl = input.fetchImpl ?? fetch;

  const mediaRes = await fetchImpl(input.mediaUrl, {
    signal: AbortSignal.timeout(60_000),
  });
  if (!mediaRes.ok) {
    throw new Error(`media_fetch_failed:${mediaRes.status}`);
  }

  const buffer = Buffer.from(await mediaRes.arrayBuffer());
  if (buffer.byteLength > MAX_BYTES) {
    throw new Error('media_too_large');
  }

  const mimeType = mimeForMediaType(input.mediaType, mediaRes.headers.get('content-type'));
  const base64 = buffer.toString('base64');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: promptForMedia(input.mediaType) },
            { inline_data: { mime_type: mimeType, data: base64 } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(90_000),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`gemini_transcribe_failed:${response.status}:${detail.slice(0, 200)}`);
  }

  const body = (await response.json()) as GeminiGenerateResponse;
  const text = body.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!text) {
    throw new Error('gemini_empty_transcription');
  }

  return { text, model };
}
