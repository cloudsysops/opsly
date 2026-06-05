import { Job } from 'bullmq';
import { randomUUID } from 'node:crypto';
import {
  SigmaDecisionHarness,
  findRulesForText,
  getRulesByIds,
  mapSeverityToVerdict,
} from '@intcloudsysops/sigma-harness';
import { createWorker } from './create-worker.js';
import type { OrchestratorJob } from '../types.js';

interface SigmaHarnessPayload {
  action: 'open' | 'auto_review' | 'finalize';
  round_id?: string;
  tenant_slug: string;
  request_id?: string;
  proposal?: {
    topic: string;
    summary: string;
    context?: Record<string, unknown>;
  };
  reviewer?: {
    agent_id: string;
    role: 'planner' | 'skeptic' | 'security' | 'validator' | 'architect';
  };
}

async function processSigmaJob(data: OrchestratorJob): Promise<unknown> {
  const payload = data.payload as unknown as SigmaHarnessPayload;
  const tenantSlug = payload.tenant_slug || data.tenant_slug;
  const harness = new SigmaDecisionHarness();
  try {
    if (payload.action === 'open') {
      if (!payload.proposal) {
        throw new Error('sigma_decision: missing proposal');
      }
      const round = await harness.createRound({
        tenantSlug,
        requestId: payload.request_id ?? data.request_id ?? randomUUID(),
        proposal: payload.proposal,
      });
      return { round_id: round.id, status: round.status, related_rule_ids: round.proposal.relatedRuleIds };
    }

    if (payload.action === 'auto_review') {
      if (!payload.round_id || !payload.reviewer || !payload.proposal) {
        throw new Error('sigma_decision: auto_review requires round_id, reviewer, proposal');
      }
      const related = findRulesForText(`${payload.proposal.topic} ${payload.proposal.summary}`, 5);
      const highSeverity = related.filter((r) => r.level === 'high' || r.level === 'critical');
      const verdict =
        highSeverity.length > 0
          ? mapSeverityToVerdict(highSeverity[0]?.level ?? 'medium')
          : ('approve' as const);
      const round = await harness.submitReview({
        roundId: payload.round_id,
        agentId: payload.reviewer.agent_id,
        role: payload.reviewer.role,
        verdict,
        rationale:
          related.length > 0
            ? `Sigma context: ${related.map((r) => r.title).join('; ')}`
            : 'No high-severity Sigma rule overlap detected.',
        suggestedRuleIds: related.map((r) => r.id),
      });
      return { round_id: payload.round_id, status: round?.status, reviews: round?.reviews.length };
    }

    if (payload.action === 'finalize') {
      if (!payload.round_id) {
        throw new Error('sigma_decision: missing round_id');
      }
      const round = await harness.getRound(payload.round_id);
      if (!round) {
        throw new Error('sigma_decision: round not found');
      }
      const rules = getRulesByIds(round.proposal.relatedRuleIds ?? []);
      return {
        round_id: round.id,
        status: round.status,
        consensus: round.consensus,
        related_rules: rules.map((r) => ({ id: r.id, title: r.title, level: r.level })),
      };
    }

    throw new Error(`sigma_decision: unknown action ${String(payload.action)}`);
  } finally {
    await harness.close();
  }
}

export function startSigmaHarnessWorker(connection: object) {
  return createWorker({
    queueName: 'openclaw',
    jobName: 'sigma_decision',
    workerName: 'sigma_decision',
    concurrencyKey: 'sigma_decision',
    connection,
    processFn: async (job: Job) => processSigmaJob(job.data as OrchestratorJob),
  });
}
