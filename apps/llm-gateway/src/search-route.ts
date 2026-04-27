import type { IncomingMessage, ServerResponse } from 'node:http';

export interface SearchHttpBody {
  tenant_slug: string;
  query: string;
  max_results?: number;
  include_raw?: boolean;
}

interface TavilyResultItem {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
  raw_content?: string;
}

interface TavilyResponse {
  query?: string;
  answer?: string;
  results?: TavilyResultItem[];
  response_time?: number;
}

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function parseMaxResults(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 5;
  }
  const rounded = Math.floor(value);
  if (rounded < 1) {
    return 1;
  }
  if (rounded > 10) {
    return 10;
  }
  return rounded;
}

function isSearchEnabled(): boolean {
  return process.env.LLM_GATEWAY_SEARCH_ENABLED === 'true';
}

/**
 * Minimal HTTP search tool for Opsly research workflows.
 * Uses Tavily API if enabled; otherwise returns 503.
 */
export async function handleSearchHttp(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const pathOnly = req.url?.split('?')[0] ?? '/';
  if (req.method !== 'POST' || pathOnly !== '/v1/search') {
    return false;
  }

  if (!isSearchEnabled()) {
    res.writeHead(503, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'search_disabled', message: 'Enable LLM_GATEWAY_SEARCH_ENABLED=true' }));
    return true;
  }

  const apiKey = process.env.TAVILY_API_KEY?.trim() ?? '';
  if (apiKey.length === 0) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'search_misconfigured', message: 'Missing TAVILY_API_KEY' }));
    return true;
  }

  let bodyRaw: string;
  try {
    bodyRaw = await readBody(req);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid_body' }));
    return true;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyRaw) as unknown;
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'json_parse_error' }));
    return true;
  }
  if (typeof parsed !== 'object' || parsed === null) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid_shape' }));
    return true;
  }
  const body = parsed as Record<string, unknown>;
  const tenantSlug = body.tenant_slug;
  const query = body.query;
  if (typeof tenantSlug !== 'string' || tenantSlug.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'tenant_slug_required' }));
    return true;
  }
  if (typeof query !== 'string' || query.trim().length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'query_required' }));
    return true;
  }
  const maxResults = parseMaxResults(body.max_results);
  const includeRaw = body.include_raw === true;

  const payload = {
    api_key: apiKey,
    query: query.trim(),
    max_results: maxResults,
    include_answer: true,
    include_raw_content: includeRaw,
    search_depth: 'advanced',
  };

  let upstream: Response;
  try {
    upstream = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'search_upstream_failed', message: msg }));
    return true;
  }

  if (!upstream.ok) {
    const text = await upstream.text();
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'search_upstream_error', status: upstream.status, body: text }));
    return true;
  }

  let data: TavilyResponse;
  try {
    data = (await upstream.json()) as TavilyResponse;
  } catch {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'search_upstream_invalid_json' }));
    return true;
  }

  const results = (data.results ?? []).map((item) => ({
    title: item.title ?? '',
    url: item.url ?? '',
    content: item.content ?? '',
    score: typeof item.score === 'number' ? item.score : 0,
    ...(includeRaw ? { raw_content: item.raw_content ?? '' } : {}),
  }));

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      tenant_slug: tenantSlug,
      query: data.query ?? query.trim(),
      answer: data.answer ?? '',
      results,
      response_time_ms: data.response_time ?? null,
    })
  );
  return true;
}
