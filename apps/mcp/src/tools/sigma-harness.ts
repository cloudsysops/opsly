/**
 * MCP tools — Sigma rule search + multi-agent decision harness.
 */

import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  SigmaDecisionHarness,
  searchRules,
  getRulesByIds,
} from '@intcloudsysops/sigma-harness';
import { applyHarnessPattern } from '@intcloudsysops/pattern-catalog';
import type { PatternReviewer } from '@intcloudsysops/pattern-catalog';
import { getOpenclawQueueConnection } from '../lib/redis-queue.js';
import type { ToolDefinition } from '../types/index.js';

const searchInputSchema = z.object({
  query: z.string().min(1),
  limit: z.number().int().positive().max(50).default(15),
});

const startDecisionSchema = z.object({
  tenant_slug: z.string().min(1),
  topic: z.string().min(1),
  summary: z.string().min(1),
  context: z.record(z.unknown()).optional(),
  pattern_id: z.string().min(1).optional(),
  auto_review: z.boolean().default(true),
});

const submitReviewSchema = z.object({
  round_id: z.string().uuid(),
  agent_id: z.string().min(1),
  role: z.enum(['planner', 'skeptic', 'security', 'validator', 'architect']),
  verdict: z.enum(['approve', 'reject', 'revise']),
  rationale: z.string().min(1),
  suggested_rule_ids: z.array(z.string()).optional(),
});

const getDecisionSchema = z.object({
  round_id: z.string().uuid(),
});

const DEFAULT_REVIEWERS: PatternReviewer[] = [
  { agent_id: 'skeptic-worker', role: 'skeptic' },
  { agent_id: 'security-bot', role: 'security' },
  { agent_id: 'planner-worker', role: 'planner' },
];

export const sigmaSearchRulesTool: ToolDefinition<
  z.infer<typeof searchInputSchema>,
  { rules: Array<{ id: string; title: string; level: string; tags: string[] }> }
> = {
  name: 'sigma:search_rules',
  description:
    'Search SigmaHQ detection rule metadata (title/tags) vendored under vendor/sigma. Run scripts/install-sigma-rules.sh first.',
  inputSchema: searchInputSchema,
  handler: async (input) => {
    const rules = searchRules(input.query, input.limit);
    return {
      rules: rules.map((r) => ({
        id: r.id,
        title: r.title,
        level: r.level,
        tags: r.tags,
      })),
    };
  },
};

export const sigmaStartDecisionTool: ToolDefinition<
  z.infer<typeof startDecisionSchema>,
  { success: boolean; round_id?: string; job_ids?: string[]; error?: string }
> = {
  name: 'sigma:start_decision',
  description:
    'Open a multi-agent decision round. Optional pattern_id from config/patterns/harness. Optionally enqueues auto-reviews.',
  inputSchema: startDecisionSchema,
  handler: async (input) => {
    const harness = new SigmaDecisionHarness();
    try {
      const requestId = randomUUID();
      const round = await harness.createRound({
        tenantSlug: input.tenant_slug,
        requestId,
        proposal: {
          topic: input.topic,
          summary: input.summary,
          context: input.context,
          patternId: input.pattern_id,
        },
      });

      const jobIds: string[] = [];
      if (input.auto_review) {
        const conn = getOpenclawQueueConnection();
        if (conn) {
          const queue = new Queue('openclaw', { connection: conn });
          try {
            const applied = input.pattern_id
              ? applyHarnessPattern({
                  patternId: input.pattern_id,
                  topic: input.topic,
                  summary: input.summary,
                })
              : null;
            const reviewers = applied?.reviewers ?? DEFAULT_REVIEWERS;
            for (const reviewer of reviewers) {
              const job = await queue.add(
                'sigma_decision',
                {
                  type: 'sigma_decision',
                  tenant_slug: input.tenant_slug,
                  request_id: requestId,
                  payload: {
                    action: 'auto_review',
                    round_id: round.id,
                    tenant_slug: input.tenant_slug,
                    proposal: {
                      topic: round.proposal.topic,
                      summary: round.proposal.summary,
                    },
                    reviewer,
                  },
                  initiated_by: 'system',
                },
                { removeOnComplete: 500, removeOnFail: 200 }
              );
              jobIds.push(String(job.id ?? ''));
            }
          } finally {
            await queue.close().catch(() => undefined);
          }
        }
      }

      return { success: true, round_id: round.id, job_ids: jobIds };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    } finally {
      await harness.close();
    }
  },
};

export const sigmaSubmitReviewTool: ToolDefinition<
  z.infer<typeof submitReviewSchema>,
  { success: boolean; round?: unknown; error?: string }
> = {
  name: 'sigma:submit_review',
  description: 'Submit an agent review vote for an open Sigma decision round.',
  inputSchema: submitReviewSchema,
  handler: async (input) => {
    const harness = new SigmaDecisionHarness();
    try {
      const round = await harness.submitReview({
        roundId: input.round_id,
        agentId: input.agent_id,
        role: input.role,
        verdict: input.verdict,
        rationale: input.rationale,
        suggestedRuleIds: input.suggested_rule_ids,
      });
      if (!round) {
        return { success: false, error: 'Round not found or already finalized' };
      }
      return { success: true, round };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    } finally {
      await harness.close();
    }
  },
};

export const sigmaGetDecisionTool: ToolDefinition<
  z.infer<typeof getDecisionSchema>,
  { success: boolean; round?: unknown; related_rules?: unknown[]; error?: string }
> = {
  name: 'sigma:get_decision',
  description: 'Fetch decision round state, reviews, and consensus outcome.',
  inputSchema: getDecisionSchema,
  handler: async (input) => {
    const harness = new SigmaDecisionHarness();
    try {
      const round = await harness.getRound(input.round_id);
      if (!round) {
        return { success: false, error: 'Round not found' };
      }
      const related = getRulesByIds(round.proposal.relatedRuleIds ?? []);
      return { success: true, round, related_rules: related };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    } finally {
      await harness.close();
    }
  },
};

export const sigmaHarnessTools = [
  sigmaSearchRulesTool,
  sigmaStartDecisionTool,
  sigmaSubmitReviewTool,
  sigmaGetDecisionTool,
];
