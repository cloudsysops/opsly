export interface WebSearchRequest {
  tenant_slug: string;
  query: string;
  request_id?: string;
  max_results?: number;
}

export interface WebSearchItem {
  title: string;
  url: string;
  snippet: string;
  score: number;
}

export interface WebSearchResult {
  provider: 'vertex' | 'tavily' | 'unknown';
  query: string;
  items: WebSearchItem[];
  request_id?: string;
}

/**
 * SAFE-AEF Phase 1 stub.
 *
 * Future implementation:
 * - Primary provider: Vertex AI Search (opslyquantum)
 * - Fallback provider: gateway /v1/search
 * - Emit structured usage/cost metadata to logger
 */
export async function searchWeb(request: WebSearchRequest): Promise<WebSearchResult> {
  const query = request.query.trim();
  if (query.length === 0) {
    throw new Error('web-search-tool: query required');
  }

  return {
    provider: 'unknown',
    query,
    request_id: request.request_id,
    items: [],
  };
}
