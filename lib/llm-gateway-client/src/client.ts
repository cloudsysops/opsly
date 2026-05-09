/**
 * HTTP client for LLM Gateway service.
 * All packages import from here to call the gateway.
 */

import type { LLMRequest, LLMResponse } from './types.js';

function getGatewayUrl(): string {
  if (typeof process !== 'undefined' && process.env.LLM_GATEWAY_URL) {
    return process.env.LLM_GATEWAY_URL;
  }
  // Default to local service on port 3010
  return 'http://localhost:3010';
}

/**
 * Call LLM Gateway with routing preference and fallback logic.
 * Used by most packages for general LLM requests.
 */
export async function llmCall(request: LLMRequest): Promise<LLMResponse> {
  const url = `${getGatewayUrl()}/chat/completions`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(
      `LLM Gateway request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<LLMResponse>;
}

/**
 * Direct call to LLM Gateway with specific provider/model.
 * Used for testing or when specific provider is required.
 */
export async function llmCallDirect(
  request: LLMRequest,
  options?: { provider?: string; model?: string }
): Promise<LLMResponse> {
  const url = new URL(`${getGatewayUrl()}/chat/completions`);

  if (options?.provider) {
    url.searchParams.set('provider', options.provider);
  }
  if (options?.model) {
    url.searchParams.set('model', options.model);
  }

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error(
      `LLM Gateway request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<LLMResponse>;
}
