#!/usr/bin/env node
/**
 * ConcurrencyGuard — hard stop against accidental parallel background agents.
 *
 * This is intentionally stricter than IdleWindowPolicy: caller overrides cannot
 * make the VPS execute background AI work. The VPS coordinates only.
 */

export const DEFAULT_FLEET_LIMITS = {
  maxBackgroundTasksFleet: 2,
  maxBackgroundTasksPerNode: {
    mac: 1,
    gamer: 1,
    vps: 0,
  },
};

export function evaluateConcurrencyGuard(input = {}) {
  const nodeType = input.nodeType ?? 'mac';
  const nodeActive = Number(input.nodeActive ?? 0);
  const fleetActive = Number(input.fleetActive ?? 0);
  const sameTaskActive = Boolean(input.sameTaskActive);
  const limits = {
    ...DEFAULT_FLEET_LIMITS,
    ...(input.limits ?? {}),
    maxBackgroundTasksPerNode: {
      ...DEFAULT_FLEET_LIMITS.maxBackgroundTasksPerNode,
      ...(input.limits?.maxBackgroundTasksPerNode ?? {}),
    },
  };

  const reasons = [];

  // Architectural invariant: VPS coordinates; it never runs background AI work.
  if (nodeType === 'vps') reasons.push('vps is coordinator-only for background AI work');

  const nodeLimit = limits.maxBackgroundTasksPerNode[nodeType];
  if (typeof nodeLimit !== 'number') reasons.push(`unknown node type: ${nodeType}`);
  else if (nodeActive >= nodeLimit) reasons.push(`node concurrency limit reached (${nodeActive}/${nodeLimit})`);

  if (fleetActive >= limits.maxBackgroundTasksFleet) {
    reasons.push(`fleet concurrency limit reached (${fleetActive}/${limits.maxBackgroundTasksFleet})`);
  }

  if (sameTaskActive) reasons.push('same task is already active');

  return {
    allowed: reasons.length === 0,
    reasons,
    node_type: nodeType,
    node_active: nodeActive,
    fleet_active: fleetActive,
    limits,
  };
}
