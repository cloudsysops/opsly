import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { handleOAuthRequest } from './auth/oauth-server.js';
import {
  generateAIContent,
  generateAIContentBilingual,
  createLLMClient,
  type AIGenerationParams,
} from '@intcloudsysops/content-studio';

const DEFAULT_PORT = 3003;

function parsePort(): number {
  const raw = process.env.PORT || String(DEFAULT_PORT);
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PORT;
}

function readRequestBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function sendCorsPreflight(res: ServerResponse, methods: string): void {
  res.writeHead(204, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': methods,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  });
  res.end();
}

function isOAuthPath(pathname: string): boolean {
  return (
    pathname === '/.well-known/oauth-authorization-server' ||
    pathname === '/oauth/authorize' ||
    pathname === '/oauth/token'
  );
}

async function handleHttp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const host = req.headers.host ?? '127.0.0.1';
  const url = new URL(req.url ?? '/', `http://${host}`);
  const pathname = url.pathname;

  if (req.method === 'OPTIONS' && isOAuthPath(pathname)) {
    sendCorsPreflight(res, 'GET, POST, OPTIONS');
    return;
  }

  const body =
    req.method === 'POST' && pathname === '/oauth/token' ? await readRequestBody(req) : '';

  if (await handleOAuthRequest(req, res, pathname, url.searchParams, body)) {
    return;
  }

  if (req.method === 'GET' && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'ok', service: 'mcp' }));
    return;
  }

  // ── Content Studio: POST /content/generate ─────────────────────────────────
  if (req.method === 'OPTIONS' && pathname.startsWith('/content/')) {
    sendCorsPreflight(res, 'POST, OPTIONS');
    return;
  }

  if (req.method === 'POST' && pathname === '/content/generate') {
    const raw = await readRequestBody(req);
    let params: AIGenerationParams;
    try {
      params = JSON.parse(raw) as AIGenerationParams;
      if (!params.topic || !['opsly', 'technology', 'motivation'].includes(params.topic)) {
        throw new Error('topic must be opsly | technology | motivation');
      }
      if (!params.tenant_slug) throw new Error('tenant_slug is required');
      params.language = params.language ?? 'both';
      params.platforms = params.platforms ?? ['instagram', 'youtube', 'tiktok'];
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: String(err) }));
      return;
    }
    const client = createLLMClient(params.tenant_slug);
    if (params.language === 'both') {
      const result = await generateAIContentBilingual(params, client);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, result }));
    } else {
      const draft = await generateAIContent(params, client);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true, draft }));
    }
    return;
  }

  // ── Content Studio: POST /content/batch ────────────────────────────────────
  if (req.method === 'POST' && pathname === '/content/batch') {
    const raw = await readRequestBody(req);
    let requests: AIGenerationParams[];
    try {
      const parsed = JSON.parse(raw) as { requests: AIGenerationParams[] };
      requests = parsed.requests;
      if (!Array.isArray(requests) || requests.length === 0 || requests.length > 5) {
        throw new Error('requests must be an array of 1-5 items');
      }
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: false, error: String(err) }));
      return;
    }
    const results = await Promise.allSettled(
      requests.map((params) => {
        const client = createLLMClient(params.tenant_slug ?? 'opsly');
        params.language = params.language ?? 'both';
        params.platforms = params.platforms ?? ['instagram', 'youtube', 'tiktok'];
        return params.language === 'both'
          ? generateAIContentBilingual(params, client)
          : generateAIContent(params, client);
      })
    );
    const drafts = results.map((r, i) =>
      r.status === 'fulfilled'
        ? { ok: true, index: i, data: r.value }
        : { ok: false, index: i, error: r.reason instanceof Error ? r.reason.message : String(r.reason) }
    );
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true, drafts }));
    return;
  }

  res.writeHead(404);
  res.end();
}

/**
 * HTTP: GET /health + OAuth 2.0 discovery / authorize / token (PKCE).
 * El servidor MCP en memoria sigue en createServer().
 */
export function startMcpHttpHealth(): void {
  const port = parsePort();
  const httpServer = createServer((req, res) => {
    void handleHttp(req, res).catch((err: unknown) => {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'internal_error', message: String(err) }));
    });
  });
  httpServer.listen(port, '0.0.0.0', () => {
    process.stderr.write(
      JSON.stringify({
        service: 'mcp',
        http: 'listening',
        port,
        paths: [
          '/health',
          '/.well-known/oauth-authorization-server',
          '/oauth/authorize',
          '/oauth/token',
        ],
      }) + '\n'
    );
  });
}
