// Content generator for Syra social media agent with Syra ↔ OpenClaw integration

import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { logUsage } from '@intcloudsysops/llm-gateway';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

// LLM Gateway configuration
const getGatewayUrl = (): string => {
  const url =
    process.env.LLM_GATEWAY_URL ?? process.env.SYRA_GATEWAY_URL ?? 'http://127.0.0.1:3010';
  return url.replace(/\/$/, '');
};

const isGatewayEnabled = process.env.SYRA_GATEWAY_ENABLED !== 'false';

const CONTENT_GENERATION_TIMEOUT_MS = 30_000; // 30 seconds
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 100;
const ERROR_MESSAGE_TRUNCATE = 500;
const BACKOFF_EXPONENT = 2;

export interface ContentJob {
  event_type: 'deployment' | 'milestone' | 'achievement' | 'phase_complete' | 'security_approved';
  source_data: {
    title: string;
    description: string;
    agents_involved: string[];
    metrics?: Record<string, unknown>;
  };
  platforms: ('twitter' | 'linkedin' | 'discord' | 'slack')[];
  requires_approval?: boolean;
}

interface TwitterContent {
  threads: string[];
  hashtags: string[];
}

interface LinkedInContent {
  title: string;
  body: string;
  tags: string[];
}

interface DiscordEmbed {
  title: string;
  description: string;
  color: number;
}

interface DiscordContent {
  content: string;
  embeds: DiscordEmbed[];
}

interface SlackBlock {
  type: string;
  text?: {
    type: string;
    text: string;
  };
}

interface SlackContent {
  text: string;
  blocks: SlackBlock[];
}

interface GatewayContentRequest {
  tenant_slug: string;
  request_id: string;
  event_type: string;
  title: string;
  description: string;
  agents_involved: string[];
  platforms: string[];
  metrics?: Record<string, unknown>;
}

interface GatewayContentResponse {
  content: {
    twitter?: TwitterContent;
    linkedin?: LinkedInContent;
    discord?: DiscordContent;
    slack?: SlackContent;
  };
  llm: {
    model_used: string;
    tokens_input: number;
    tokens_output: number;
    cost_usd: number;
    cache_hit: boolean;
  };
  request_id: string;
}

/**
 * Performs a single fetch attempt to LLM Gateway
 */
async function performGatewayFetch(
  url: string,
  request: GatewayContentRequest,
  tenantSlug: string,
  sessionRequestId?: string
): Promise<GatewayContentResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONTENT_GENERATION_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-request-id': request.request_id,
        'x-tenant-slug': tenantSlug,
        ...(sessionRequestId ? { 'x-session-request-id': sessionRequestId } : {}),
      },
      body: JSON.stringify(request),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      const errorMsg = text.slice(0, ERROR_MESSAGE_TRUNCATE);
      throw new Error(`LLM Gateway HTTP ${response.status}: ${errorMsg}`);
    }

    return (await response.json()) as GatewayContentResponse;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Logs usage metrics to OpenClaw for cost tracking
 */
async function recordGatewayUsage(
  tenantSlug: string,
  response: GatewayContentResponse,
  request: GatewayContentRequest,
  requestId: string
): Promise<void> {
  await logUsage({
    tenant_slug: tenantSlug,
    model: response.llm.model_used,
    tokens_input: response.llm.tokens_input,
    tokens_output: response.llm.tokens_output,
    cost_usd: response.llm.cost_usd,
    cache_hit: response.llm.cache_hit,
    request_id: requestId,
    created_at: new Date().toISOString(),
    feature: 'content_generation',
    metadata: {
      event_type: request.event_type,
      platforms: request.platforms,
      via_gateway: true,
    },
  }).catch((err) => {
    console.warn('[Syra] logUsage warning:', err);
  });
}

/**
 * Handles retry logic with exponential backoff
 */
async function executeWithRetry(
  url: string,
  request: GatewayContentRequest,
  tenantSlug: string,
  sessionRequestId?: string
): Promise<GatewayContentResponse | null> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const data = await performGatewayFetch(url, request, tenantSlug, sessionRequestId);

      // Log usage to OpenClaw for cost tracking

      await recordGatewayUsage(tenantSlug, data, request, request.request_id);

      return data;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Handle timeout specifically
      if (lastError.name === 'AbortError') {
        lastError = new Error(
          `Content generation timeout after ${CONTENT_GENERATION_TIMEOUT_MS}ms`
        );
      }

      // If this is the last attempt, log and return null for fallback
      if (attempt === MAX_RETRIES - 1) {
        console.warn(`[Syra] Gateway failed after ${MAX_RETRIES} retries:`, lastError.message);
        return null;
      }

      // Exponential backoff
      const backoffMs = INITIAL_BACKOFF_MS * Math.pow(BACKOFF_EXPONENT, attempt);

      console.warn(
        `[Syra] Gateway attempt ${attempt + 1} failed, retrying in ${backoffMs}ms:`,
        lastError.message
      );

      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  return null;
}

/**
 * Calls LLM Gateway for content generation with retry logic and exponential backoff.
 * Gracefully falls back to local generation if gateway is unavailable.
 */
async function callGatewayForContent(
  request: GatewayContentRequest,
  tenantSlug: string,
  sessionRequestId?: string
): Promise<GatewayContentResponse | null> {
  if (!isGatewayEnabled) {
    return null;
  }

  const url = `${getGatewayUrl()}/v1/text`;
  return executeWithRetry(url, request, tenantSlug, sessionRequestId);
}

/**
 * Records local generation as observability event
 */
async function recordLocalGeneration(
  tenantSlug: string,
  request: GatewayContentRequest,
  requestId: string,
  viaGateway: boolean
): Promise<void> {
  await logUsage({
    tenant_slug: tenantSlug,
    model: 'claude_local_generation',
    tokens_input: 0,
    tokens_output: 0,
    cost_usd: 0,
    cache_hit: false,
    request_id: requestId,
    created_at: new Date().toISOString(),
    feature: 'content_generation',
    metadata: {
      event_type: request.event_type,
      platforms: request.platforms,
      via_gateway: viaGateway,
      fallback_reason: viaGateway ? 'enabled' : 'disabled',
    },
  }).catch((err) => {
    console.warn('[Syra] logUsage warning:', err);
  });
}

export class SyraContentGenerator {
  private supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
  });

  private tenantSlug: string = process.env.OPSLY_INTERNAL_TENANT_SLUG || 'platform';

  private generateTwitter(job: ContentJob): TwitterContent {
    const title = job.source_data.title;
    const agents = job.source_data.agents_involved.join(', ');
    return {
      threads: [`✨ ${title}\n\nAgents: ${agents}\n\n🚀 #Opsly #AI #DevOps`],
      hashtags: ['#Opsly', '#AI', '#DevOps'],
    };
  }

  private generateLinkedIn(job: ContentJob): LinkedInContent {
    return {
      title: job.source_data.title,
      body: job.source_data.description,
      tags: ['AI', 'DevOps', 'Automation'],
    };
  }

  private generateDiscord(job: ContentJob): DiscordContent {
    return {
      content: `🎉 ${job.source_data.title}`,
      embeds: [
        {
          title: job.source_data.title,
          description: job.source_data.description,
          color: 0x00ff00,
        },
      ],
    };
  }

  private generateSlack(job: ContentJob): SlackContent {
    return {
      text: `*${job.source_data.title}*\n${job.source_data.description}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${job.source_data.title}*`,
          },
        },
      ],
    };
  }

  private generateLocalContent(job: ContentJob): {
    twitter?: TwitterContent;
    linkedin?: LinkedInContent;
    discord?: DiscordContent;
    slack?: SlackContent;
  } {
    const content: {
      twitter?: TwitterContent;
      linkedin?: LinkedInContent;
      discord?: DiscordContent;
      slack?: SlackContent;
    } = {};

    if (job.platforms.includes('twitter')) {
      content.twitter = this.generateTwitter(job);
    }
    if (job.platforms.includes('linkedin')) {
      content.linkedin = this.generateLinkedIn(job);
    }
    if (job.platforms.includes('discord')) {
      content.discord = this.generateDiscord(job);
    }
    if (job.platforms.includes('slack')) {
      content.slack = this.generateSlack(job);
    }

    return content;
  }

  private gatewayRequestPayload(job: ContentJob, requestId: string): GatewayContentRequest {
    return {
      tenant_slug: this.tenantSlug,
      request_id: requestId,
      event_type: job.event_type,
      title: job.source_data.title,
      description: job.source_data.description,
      agents_involved: job.source_data.agents_involved,
      platforms: job.platforms,
      metrics: job.source_data.metrics,
    };
  }

  private async resolveContentFromGatewayOrLocal(
    job: ContentJob,
    requestId: string,
    sessionRequestId?: string
  ): Promise<{
    content: {
      twitter?: TwitterContent;
      linkedin?: LinkedInContent;
      discord?: DiscordContent;
      slack?: SlackContent;
    };
    viaGateway: boolean;
  }> {
    if (isGatewayEnabled) {
      const gatewayRequest = this.gatewayRequestPayload(job, requestId);
      const gatewayResponse = await callGatewayForContent(
        gatewayRequest,
        this.tenantSlug,
        sessionRequestId
      );
      if (gatewayResponse) {
        console.warn('[Syra] Content generated via OpenClaw gateway');
        return { content: gatewayResponse.content, viaGateway: true };
      }
      console.warn('[Syra] Gateway unavailable, falling back to local generation');
    }

    const content = this.generateLocalContent(job);
    await recordLocalGeneration(
      this.tenantSlug,
      this.gatewayRequestPayload(job, requestId),
      requestId,
      false
    );
    return { content, viaGateway: false };
  }

  private async insertGeneratedContentRow(
    job: ContentJob,
    content: {
      twitter?: TwitterContent;
      linkedin?: LinkedInContent;
      discord?: DiscordContent;
      slack?: SlackContent;
    },
    requestId: string,
    viaGateway: boolean
  ): Promise<string | undefined> {
    const { data } = await this.supabase
      .from('generated_content')
      .insert({
        event_type: job.event_type,
        source_data: job.source_data,
        content,
        platforms: job.platforms,
        status: job.requires_approval ? 'pending_approval' : 'approved',
        created_at: new Date().toISOString(),
        request_id: requestId,
        via_gateway: viaGateway,
      })
      .select();

    return data?.[0]?.id as string | undefined;
  }

  async generateContent(
    job: ContentJob,
    sessionRequestId?: string
  ): Promise<{
    content: {
      twitter?: TwitterContent;
      linkedin?: LinkedInContent;
      discord?: DiscordContent;
      slack?: SlackContent;
    };
    content_id: string | undefined;
    requires_approval: boolean;
    request_id: string;
    via_gateway: boolean;
  }> {
    const requestId = `syra:${this.tenantSlug}:${randomUUID()}`;
    const { content, viaGateway } = await this.resolveContentFromGatewayOrLocal(
      job,
      requestId,
      sessionRequestId
    );
    const contentId = await this.insertGeneratedContentRow(job, content, requestId, viaGateway);

    return {
      content,
      content_id: contentId,
      requires_approval: job.requires_approval ?? true,
      request_id: requestId,
      via_gateway: viaGateway,
    };
  }
}

export const syraGenerator = new SyraContentGenerator();
