// Syra ↔ OpenClaw Gateway Integration
// Manages LLM Gateway calls for social content generation and usage tracking

import { randomUUID } from 'node:crypto';
import { llmCall, logUsage } from '@intcloudsysops/llm-gateway';

const SYRA_GATEWAY_MODEL = 'syra_content_generation';
const SYRA_DEFAULT_TEMPERATURE = 0.7;
const SYRA_DEFAULT_MAX_TOKENS = 280;

export interface GatewayCallOptions {
  tenant_slug: string;
  request_id?: string;
  content_type: 'twitter' | 'linkedin' | 'discord' | 'slack' | 'multi';
  prompt: string;
  temperature?: number;
  max_tokens?: number;
  metadata?: Record<string, unknown>;
}

export interface GatewayCallResult {
  content: string;
  request_id: string;
  tokens_input: number;
  tokens_output: number;
  cost_usd: number;
}

function translateGatewayFailure(err: Error, contentType: string, tenantSlug: string): Error {
  if (err.message.includes('timeout') || err.message.includes('ECONNREFUSED')) {
    return new Error(`Gateway timeout for ${contentType}: ${err.message}`);
  }
  if (err.message.includes('429')) {
    return new Error(`Gateway rate limited (429) for tenant ${tenantSlug}`);
  }
  return err;
}

async function persistGatewayUsage(
  options: GatewayCallOptions,
  requestId: string,
  response: Awaited<ReturnType<typeof llmCall>>
): Promise<GatewayCallResult> {
  const tokensInput = response.tokens_input ?? 0;
  const tokensOutput = response.tokens_output ?? 0;
  const costUsd = response.cost_usd ?? 0;

  await logUsage({
    tenant_slug: options.tenant_slug,
    model: SYRA_GATEWAY_MODEL,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    cost_usd: costUsd,
    cache_hit: response.cache_hit ?? false,
    request_id: requestId,
    created_at: new Date().toISOString(),
    feature: `social_content_${options.content_type}`,
    metadata: {
      ...options.metadata,
      gateway_provider: 'openclaw',
      syra_agent: true,
    },
  });

  return {
    content: response.content,
    request_id: requestId,
    tokens_input: tokensInput,
    tokens_output: tokensOutput,
    cost_usd: costUsd,
  };
}

/**
 * Calls the LLM Gateway for social content generation with full traceability.
 * Handles request_id propagation and automatic usage logging.
 */
export async function callGatewayForContent(
  options: GatewayCallOptions
): Promise<GatewayCallResult> {
  const requestId = options.request_id ?? `syra:${options.tenant_slug}:${randomUUID()}`;

  try {
    const response = await llmCall({
      tenant_slug: options.tenant_slug,
      model: SYRA_GATEWAY_MODEL,
      temperature: options.temperature ?? SYRA_DEFAULT_TEMPERATURE,
      max_tokens: options.max_tokens ?? SYRA_DEFAULT_MAX_TOKENS,
      cache: false,
      system: `You are Syra, a social media content specialist for DevOps and AI platforms.
Generate engaging, professional ${options.content_type} content based on the provided context.
Keep content concise, relevant, and platform-appropriate.`,
      messages: [
        {
          role: 'user',
          content: options.prompt,
        },
      ],
      request_id: requestId,
    });

    return await persistGatewayUsage(options, requestId, response);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    throw translateGatewayFailure(err, options.content_type, options.tenant_slug);
  }
}

/**
 * Batch call to gateway for multiple content types.
 * Propagates request_id across all calls for traceability.
 */
export async function callGatewayForMultipleContentTypes(
  options: Omit<GatewayCallOptions, 'content_type'> & {
    content_types: Array<'twitter' | 'linkedin' | 'discord' | 'slack'>;
  }
): Promise<Record<string, GatewayCallResult>> {
  const requestId = options.request_id ?? `syra:${options.tenant_slug}:${randomUUID()}`;
  const results: Record<string, GatewayCallResult> = {};

  for (const contentType of options.content_types) {
    try {
      const result = await callGatewayForContent({
        ...options,
        content_type: contentType,
        request_id: requestId,
      });
      results[contentType] = result;
    } catch (error) {
      console.error(`Failed to generate content for ${contentType}:`, error);
    }
  }

  return results;
}
