import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

const embedText = vi.hoisted(() => vi.fn());
const embedTexts = vi.hoisted(() => vi.fn());

vi.mock('../src/embeddings.js', () => ({
  embedText,
  embedTexts,
}));

import { handleEmbeddingsHttp } from '../src/embeddings-route.js';

describe('handleEmbeddingsHttp', () => {
  let server: ReturnType<typeof createServer>;
  let port: number;

  beforeAll(async () => {
    server = createServer((req, res) => {
      void (async () => {
        const handled = await handleEmbeddingsHttp(req, res);
        if (!handled) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'not_found' }));
        }
      })();
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        resolve();
      });
    });
    const addr = server.address() as AddressInfo;
    port = addr.port;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('POST /v1/embeddings con input string devuelve data[0].embedding', async () => {
    const vec = Array.from({ length: 1536 }, (_, i) => (i === 0 ? 1 : 0));
    embedText.mockResolvedValueOnce(vec);

    const res = await fetch(`http://127.0.0.1:${String(port)}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'text-embedding-3-small', input: 'hola' }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: Array<{ embedding: number[] }> };
    expect(body.data?.[0]?.embedding).toEqual(vec);
    expect(embedText).toHaveBeenCalledWith('hola');
  });

  it('POST /v1/embeddings con input array usa embedTexts', async () => {
    const v0 = Array.from({ length: 1536 }, (_, i) => (i === 0 ? 1 : 0));
    const v1 = Array.from({ length: 1536 }, (_, i) => (i === 1 ? 1 : 0));
    embedTexts.mockResolvedValueOnce([v0, v1]);

    const res = await fetch(`http://127.0.0.1:${String(port)}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: ['a', 'b'] }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data?: Array<{ index: number; embedding: number[] }> };
    expect(body.data).toHaveLength(2);
    expect(body.data?.[0]?.embedding).toEqual(v0);
    expect(body.data?.[1]?.embedding).toEqual(v1);
    expect(embedTexts).toHaveBeenCalledWith(['a', 'b']);
  });

  it('devuelve 503 si embedText devuelve null', async () => {
    embedText.mockResolvedValueOnce(null);

    const res = await fetch(`http://127.0.0.1:${String(port)}/v1/embeddings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: 'x' }),
    });
    expect(res.status).toBe(503);
  });
});
