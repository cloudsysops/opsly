import type { IncomingMessage, ServerResponse } from 'node:http';

import { embedText, embedTexts } from './embeddings.js';

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

/**
 * OpenAI-compatible single/batch embeddings for internal callers (orchestrator memory, knowledge-base).
 * POST /v1/embeddings — body `{ model?, input: string | string[] }`.
 */
export async function handleEmbeddingsHttp(
  req: IncomingMessage,
  res: ServerResponse
): Promise<boolean> {
  const pathOnly = req.url?.split('?')[0] ?? '/';
  if (req.method !== 'POST' || pathOnly !== '/v1/embeddings') {
    return false;
  }

  let bodyRaw: string;
  try {
    bodyRaw = await readBody(req);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid body' }));
    return true;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyRaw) as unknown;
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'JSON parse error' }));
    return true;
  }

  if (typeof parsed !== 'object' || parsed === null) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid body shape' }));
    return true;
  }

  const rec = parsed as Record<string, unknown>;
  const input = rec.input;

  try {
    if (typeof input === 'string') {
      const text = input.length > 8000 ? input.slice(0, 8000) : input;
      const embedding = await embedText(text);
      if (!embedding) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(
          JSON.stringify({
            error: 'embeddings_unavailable',
            message: 'Embedding generation failed (check OPENAI_API_KEY on llm-gateway)',
          })
        );
        return true;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          object: 'list',
          model: typeof rec.model === 'string' ? rec.model : 'text-embedding-3-small',
          data: [{ object: 'embedding', index: 0, embedding }],
        })
      );
      return true;
    }

    if (Array.isArray(input)) {
      const texts = input
        .filter((v): v is string => typeof v === 'string')
        .map((t) => (t.length > 8000 ? t.slice(0, 8000) : t))
        .slice(0, 50);
      if (texts.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'input must be non-empty string or string[]' }));
        return true;
      }
      const embeddings = await embedTexts(texts);
      const data = embeddings.map((emb, index) => {
        if (!emb) {
          return { object: 'embedding', index, embedding: null as number[] | null };
        }
        return { object: 'embedding', index, embedding: emb };
      });
      if (data.some((d) => d.embedding === null)) {
        res.writeHead(503, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'embeddings_unavailable', message: 'One or more embeddings failed' }));
        return true;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(
        JSON.stringify({
          object: 'list',
          model: typeof rec.model === 'string' ? rec.model : 'text-embedding-3-small',
          data: data.map((d) => ({ object: 'embedding', index: d.index, embedding: d.embedding })),
        })
      );
      return true;
    }

    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'input must be string or string[]' }));
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'embeddings_error', message: msg }));
    return true;
  }
}
