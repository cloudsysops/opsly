#!/usr/bin/env node
import { evaluateIdleWindow } from './idle-window-policy.mjs';
import { selectBackgroundTask } from './background-task-selector.mjs';
import { evaluateConcurrencyGuard } from './concurrency-guard.mjs';

/**
 * Pure scheduler decision composition. It does not enqueue work.
 * Returns one of:
 * - RUN: a task is safe/eligible and concurrency allows it
 * - NO_CAPACITY: resources/locks/concurrency refuse execution
 * - NO_SAFE_TASK: capacity exists but no candidate is safe
 */
export function decideBackgroundWork(input = {}) {
  const idle = evaluateIdleWindow(
    input.snapshot ?? {},
    input.nodeType ?? 'mac',
    {
      active_background_agents: input.nodeActive ?? 0,
      active_lock_reasons: input.activeLockReasons ?? [],
      ...(input.idleOptions ?? {}),
    },
  );

  if (!idle.eligible) {
    return { decision: 'NO_CAPACITY', selected: null, idle, concurrency: null, selector: null };
  }

  const concurrency = evaluateConcurrencyGuard({
    nodeType: input.nodeType ?? 'mac',
    nodeActive: input.nodeActive ?? 0,
    fleetActive: input.fleetActive ?? 0,
    sameTaskActive: false,
    limits: input.concurrencyLimits,
  });

  if (!concurrency.allowed) {
    return { decision: 'NO_CAPACITY', selected: null, idle, concurrency, selector: null };
  }

  const selector = selectBackgroundTask(input.candidates ?? [], {
    nodeType: input.nodeType ?? 'mac',
    maxResourceClass: input.maxResourceClass ?? 'small',
    activeTaskIds: input.activeTaskIds ?? [],
    recentlyCompletedTaskIds: input.recentlyCompletedTaskIds ?? [],
  });

  if (selector.decision !== 'RUN') {
    return { decision: 'NO_SAFE_TASK', selected: null, idle, concurrency, selector };
  }

  const selectedConcurrency = evaluateConcurrencyGuard({
    nodeType: input.nodeType ?? 'mac',
    nodeActive: input.nodeActive ?? 0,
    fleetActive: input.fleetActive ?? 0,
    sameTaskActive: (input.activeTaskIds ?? []).includes(selector.selected.id),
    limits: input.concurrencyLimits,
  });

  if (!selectedConcurrency.allowed) {
    return {
      decision: 'NO_CAPACITY',
      selected: null,
      idle,
      concurrency: selectedConcurrency,
      selector,
    };
  }

  return {
    decision: 'RUN',
    selected: selector.selected,
    idle,
    concurrency: selectedConcurrency,
    selector,
  };
}
