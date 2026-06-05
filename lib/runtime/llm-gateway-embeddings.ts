/**
 * Gateway Embeddings Wrapper
 * DR-033: Migrar llamadas IA legacy a LLM Gateway
 *
 * Uso en lugar de llamadas directas a OpenAI API
 * Proporciona: caching, métricas, rate limiting, trazabilidad
 */

const GATEWAY_URL = process.env.LLM_GATEWAY_URL || 'http://localhost:3010';

export interface EmbeddingsRequest {
  input: string | string[];
  model?: string;
  tenant_slug?: string;
}

export interface EmbeddingsResponse {
  data?: Array<{ embedding: number[]; index: number }>;
  error?: string;
}

/**
 * Obtener embeddings via LLM Gateway
 *
 * @param text - Texto a embeber (o array de textos)
 * @param tenant_slug - Para métricas y trazabilidad
 * @returns Array de embeddings
 */
export async function getEmbeddingsViaGateway(
  text: string | string[],
  tenant_slug?: string
): Promise<number[][]> {
  const input = Array.isArray(text) ? text : [text];

  const response = await fetch(`${GATEWAY_URL}/v1/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(tenant_slug ? { 'x-tenant-slug': tenant_slug } : {}),
    },
    body: JSON.stringify({
      input,
      model: 'text-embedding-3-small',
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gateway embeddings failed: ${response.status} - ${error.slice(0, 200)}`);
  }

  const result: EmbeddingsResponse = await response.json();

  if (result.error) {
    throw new Error(`Gateway embeddings error: ${result.error}`);
  }

  // Ordenar por índice para mantener orden
  const embeddings = result.data?.sort((a, b) => a.index - b.index).map((d) => d.embedding) || [];

  return embeddings;
}

/**
 * Obtener embedding para un solo texto
 */
export async function getSingleEmbedding(text: string, tenant_slug?: string): Promise<number[]> {
  const embeddings = await getEmbeddingsViaGateway(text, tenant_slug);
  return embeddings[0];
}

export default { getEmbeddingsViaGateway, getSingleEmbedding };
