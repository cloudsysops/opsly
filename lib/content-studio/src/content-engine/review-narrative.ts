import { randomUUID } from 'node:crypto';
import { GatewayClient, resolveContentReviewRoutingModel } from '../llm/client.js';
import type { ReviewFinding } from './types.js';

export interface NarrativeAdapterResult {
  used: boolean;
  model: string;
  findings: ReviewFinding[];
  notes: string[];
}

export function newRequestId(): string {
  return `content-narrative-${randomUUID()}`;
}

/**
 * Optional narrative reviewer, routed through the LLM Gateway (OpenClaw) —
 * never a direct local model endpoint. Independent of the creator agent
 * context. Fail-closed when the gateway is unavailable: deterministic QA
 * remains the source of truth and no findings are returned.
 */
export async function runOptionalNarrativeReview(input: {
  title?: string;
  captions?: string;
  transcript?: string;
  durationSec: number;
  tenantSlug?: string;
}): Promise<NarrativeAdapterResult> {
  const gatewayUrl = process.env.LLM_GATEWAY_URL;
  if (!gatewayUrl || process.env.OPSLY_CONTENT_NARRATIVE_ENABLED !== 'true') {
    return {
      used: false,
      model: 'metadata-deterministic',
      findings: [],
      notes: ['narrative adapter skipped (OPSLY_CONTENT_NARRATIVE_ENABLED!=true or no LLM_GATEWAY_URL)'],
    };
  }

  const prompt = [
    'You are an independent narrative reviewer for a gameplay short.',
    'Creator reasoning is withheld. Review only the final artifact text.',
    'Do not invent events not present in the transcript/captions.',
    'Score hook, pacing, payoff, dead time, repetition, title alignment.',
    'Reply JSON array of {severity,category,issue,recommended_fix} or [].',
    `title: ${input.title ?? ''}`,
    `captions: ${input.captions ?? ''}`,
    `transcript: ${(input.transcript ?? '').slice(0, 1200)}`,
    `durationSec: ${input.durationSec}`,
  ].join('\n');

  const routingModel = resolveContentReviewRoutingModel(
    process.env.OPSLY_CONTENT_NARRATIVE_MODEL,
    'cheap'
  );
  const client = new GatewayClient(input.tenantSlug ?? 'opsly', gatewayUrl);

  try {
    const text = await client.review(
      'Independent narrative reviewer for Opsly content.',
      prompt,
      { model: routingModel, requestId: newRequestId(), feature: 'content_studio' }
    );
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) {
      return {
        used: true,
        model: routingModel,
        findings: [],
        notes: ['no JSON findings from narrative model'],
      };
    }
    const parsed = JSON.parse(match[0]) as Array<{
      severity?: string;
      category?: string;
      issue?: string;
      recommended_fix?: string;
    }>;
    const allowed = new Set(['HOOK', 'PACING', 'STORY', 'GAMEPLAY', 'CAPTIONS', 'METADATA']);
    const findings: ReviewFinding[] = parsed
      .filter((item) => item.issue && item.recommended_fix)
      .slice(0, 5)
      .map((item, index) => ({
        finding_id: `narrative-${index}`,
        severity:
          item.severity === 'CRITICAL' || item.severity === 'IMPORTANT' || item.severity === 'MINOR'
            ? item.severity
            : 'MINOR',
        timecode_start: 0,
        timecode_end: input.durationSec,
        category: allowed.has(String(item.category)) ? (item.category as ReviewFinding['category']) : 'STORY',
        issue: String(item.issue),
        recommended_fix: String(item.recommended_fix),
        evidence: 'narrative:llm-gateway',
        repairable: true,
      }));
    return { used: true, model: routingModel, findings, notes: [] };
  } catch (error) {
    return {
      used: false,
      model: routingModel,
      findings: [],
      notes: [`narrative gateway call failed: ${error instanceof Error ? error.message : 'unknown'}`],
    };
  }
}