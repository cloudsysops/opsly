import { randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { computeConsensus, roundIsFinal } from './consensus.js';
import { findRulesForText } from './rule-index.js';
import { getHarnessConfig } from './paths.js';
import type {
  AgentReviewerRole,
  DecisionProposal,
  DecisionReview,
  DecisionRound,
  HarnessEvent,
} from './types.js';

function parseRedisConfig(): { host: string; port: number; password?: string } {
  const raw = process.env.REDIS_URL || 'redis://localhost:6379';
  const parsed = new URL(raw);
  const password = parsed.password ? decodeURIComponent(parsed.password) : '';
  return {
    host: parsed.hostname,
    port: Number(parsed.port || '6379'),
    password: process.env.REDIS_PASSWORD || password || undefined,
  };
}

export function createHarnessRedisClient(): Redis {
  const cfg = parseRedisConfig();
  return new Redis({
    host: cfg.host,
    port: cfg.port,
    password: cfg.password,
    lazyConnect: false,
    maxRetriesPerRequest: null,
  });
}

export class SigmaDecisionHarness {
  private readonly redis: Redis;
  private readonly publisher: Redis;
  private readonly prefix: string;

  constructor(redis?: Redis) {
    this.redis = redis ?? createHarnessRedisClient();
    this.publisher = this.redis.duplicate();
    this.prefix = getHarnessConfig().redisKeyPrefix;
  }

  private roundKey(roundId: string): string {
    return `${this.prefix}:round:${roundId}`;
  }

  private eventChannel(): string {
    return `${this.prefix}:events`;
  }

  async publishEvent(event: HarnessEvent): Promise<void> {
    await this.publisher.publish(this.eventChannel(), JSON.stringify(event));
  }

  async createRound(input: {
    tenantSlug: string;
    requestId: string;
    proposal: DecisionProposal;
  }): Promise<DecisionRound> {
    const now = new Date().toISOString();
    const related = findRulesForText(
      `${input.proposal.topic} ${input.proposal.summary}`,
      8
    ).map((rule) => rule.id);

    const round: DecisionRound = {
      id: randomUUID(),
      tenantSlug: input.tenantSlug,
      requestId: input.requestId,
      proposal: {
        ...input.proposal,
        relatedRuleIds: input.proposal.relatedRuleIds ?? related,
      },
      status: 'open',
      reviews: [],
      createdAt: now,
      updatedAt: now,
    };

    await this.redis.set(this.roundKey(round.id), JSON.stringify(round), 'EX', 86_400);
    await this.publishEvent({
      type: 'decision_opened',
      roundId: round.id,
      tenantSlug: round.tenantSlug,
      payload: { proposal: round.proposal },
      timestamp: now,
    });
    return round;
  }

  async getRound(roundId: string): Promise<DecisionRound | null> {
    const raw = await this.redis.get(this.roundKey(roundId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw) as DecisionRound;
  }

  async submitReview(input: {
    roundId: string;
    agentId: string;
    role: AgentReviewerRole;
    verdict: DecisionReview['verdict'];
    rationale: string;
    suggestedRuleIds?: string[];
  }): Promise<DecisionRound | null> {
    const round = await this.getRound(input.roundId);
    if (!round || roundIsFinal(round.status)) {
      return round;
    }

    const review: DecisionReview = {
      agentId: input.agentId,
      role: input.role,
      verdict: input.verdict,
      rationale: input.rationale,
      suggestedRuleIds: input.suggestedRuleIds,
      timestamp: new Date().toISOString(),
    };

    const reviews = [...round.reviews.filter((r) => r.agentId !== input.agentId), review];
    const harness = getHarnessConfig();
    const consensus = computeConsensus(reviews, {
      quorumMinReviews: harness.quorumMinReviews,
      consensusThreshold: harness.consensusThreshold,
    });

    const updated: DecisionRound = {
      ...round,
      reviews,
      status: consensus.status,
      consensus: roundIsFinal(consensus.status)
        ? {
            verdict: consensus.verdict,
            score: consensus.score,
            summary: consensus.summary,
          }
        : undefined,
      updatedAt: new Date().toISOString(),
    };

    await this.redis.set(this.roundKey(round.id), JSON.stringify(updated), 'EX', 86_400);
    await this.publishEvent({
      type: roundIsFinal(updated.status) ? 'consensus_reached' : 'review_submitted',
      roundId: updated.id,
      tenantSlug: updated.tenantSlug,
      payload: { review, consensus },
      timestamp: updated.updatedAt,
    });

    if (updated.status === 'revise') {
      await this.publishEvent({
        type: 'correction_requested',
        roundId: updated.id,
        tenantSlug: updated.tenantSlug,
        payload: { consensus },
        timestamp: updated.updatedAt,
      });
    }

    return updated;
  }

  async close(): Promise<void> {
    await this.publisher.quit();
    if (this.redis.status !== 'end') {
      await this.redis.quit();
    }
  }
}
