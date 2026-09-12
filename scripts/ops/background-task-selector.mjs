#!/usr/bin/env node
/**
 * BackgroundTaskSelector — pure selection logic for opportunistic background work.
 *
 * Input candidates are already-discovered tasks. This module does not read GitHub,
 * mutate markdown, claim work, enqueue BullMQ jobs, or invoke agents. It chooses
 * at most one safe candidate after excluding duplicates/blocked/risky work.
 */

export const BACKGROUND_PRIORITY_ORDER = { P1: 0, P2: 1, P3: 2 };

export function normalizeBackgroundCandidate(input = {}) {
  return {
    id: String(input.id ?? '').trim(),
    title: String(input.title ?? input.id ?? '').trim(),
    status: String(input.status ?? 'pending').toLowerCase(),
    priority: ['P1', 'P2', 'P3'].includes(input.priority) ? input.priority : 'P3',
    runtime: String(input.runtime ?? '').trim(),
    nodeTypes: Array.isArray(input.nodeTypes) ? input.nodeTypes : ['mac'],
    resourceClass: ['small', 'medium', 'large'].includes(input.resourceClass)
      ? input.resourceClass
      : 'small',
    blocked: Boolean(input.blocked),
    requiresApproval: Boolean(input.requiresApproval),
    paidInfraRequired: Boolean(input.paidInfraRequired),
    productionDeploy: Boolean(input.productionDeploy),
    activeElsewhere: Boolean(input.activeElsewhere),
    safeAutonomy: input.safeAutonomy !== false,
    estimatedMinutes: Number.isFinite(Number(input.estimatedMinutes))
      ? Number(input.estimatedMinutes)
      : 30,
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : {},
  };
}

function resourceRank(value) {
  return { small: 0, medium: 1, large: 2 }[value] ?? 0;
}

export function explainCandidateIneligibility(candidate, context = {}) {
  const reasons = [];
  const nodeType = context.nodeType ?? 'mac';
  const maxResourceClass = context.maxResourceClass ?? 'small';
  const activeTaskIds = new Set(context.activeTaskIds ?? []);
  const recentlyCompletedTaskIds = new Set(context.recentlyCompletedTaskIds ?? []);

  if (!candidate.id) reasons.push('missing task id');
  if (candidate.status !== 'pending') reasons.push(`status=${candidate.status}`);
  if (candidate.blocked) reasons.push('blocked');
  if (candidate.activeElsewhere || activeTaskIds.has(candidate.id)) reasons.push('duplicate/active elsewhere');
  if (recentlyCompletedTaskIds.has(candidate.id)) reasons.push('recently completed');
  if (!candidate.safeAutonomy) reasons.push('not safe for autonomous execution');
  if (candidate.requiresApproval) reasons.push('requires human approval');
  if (candidate.paidInfraRequired) reasons.push('paid infrastructure required');
  if (candidate.productionDeploy) reasons.push('production deploy not allowed for background work');
  if (!candidate.nodeTypes.includes(nodeType)) reasons.push(`node type ${nodeType} unsupported`);
  if (resourceRank(candidate.resourceClass) > resourceRank(maxResourceClass)) {
    reasons.push(`resource class ${candidate.resourceClass} exceeds ${maxResourceClass}`);
  }
  if (!candidate.runtime) reasons.push('runtime not specified');

  return reasons;
}

export function selectBackgroundTask(inputs, context = {}) {
  const candidates = (inputs ?? []).map(normalizeBackgroundCandidate);
  const evaluated = candidates.map((candidate) => ({
    candidate,
    reasons: explainCandidateIneligibility(candidate, context),
  }));

  const eligible = evaluated
    .filter((entry) => entry.reasons.length === 0)
    .map((entry) => entry.candidate)
    .sort((a, b) => {
      const priorityDiff =
        (BACKGROUND_PRIORITY_ORDER[a.priority] ?? 99) -
        (BACKGROUND_PRIORITY_ORDER[b.priority] ?? 99);
      if (priorityDiff !== 0) return priorityDiff;
      const resourceDiff = resourceRank(a.resourceClass) - resourceRank(b.resourceClass);
      if (resourceDiff !== 0) return resourceDiff;
      const durationDiff = a.estimatedMinutes - b.estimatedMinutes;
      if (durationDiff !== 0) return durationDiff;
      return a.id.localeCompare(b.id);
    });

  return {
    decision: eligible.length ? 'RUN' : 'NO_SAFE_TASK',
    selected: eligible[0] ?? null,
    eligible_count: eligible.length,
    rejected: evaluated
      .filter((entry) => entry.reasons.length > 0)
      .map((entry) => ({ id: entry.candidate.id, reasons: entry.reasons })),
  };
}
