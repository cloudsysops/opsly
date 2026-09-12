#!/usr/bin/env node
/**
 * IdleWindowPolicy — decides whether *this node, right now* has spare
 * capacity for one opportunistic background AgentTask. Pure decision logic
 * over a ResourceProbe snapshot; does not read live state itself and does
 * not execute anything.
 *
 * This is a resource-availability gate only. It is deliberately NOT:
 * - a cost gate (see config/cloud-cost-policy.json / #1238 — a background
 *   scheduler must call that separately before spending anything);
 * - a task-provenance gate (see TaskSourceGuard, lib/agent-task-core);
 * - a concurrency gate across the whole fleet (a future ConcurrencyGuard
 *   would track cross-node totals; this only knows about the one node it's
 *   called for).
 *
 * "No foreground task / no gaming lock" is caller-supplied via
 * `active_lock_reasons`, not detected here. The PC-Gamer node already has a
 * real signal for this (config/pc-gamer-schedule.json modes +
 * scripts/ops/pc-gamer-gameplay-watcher.mjs) — a caller on that node should
 * populate active_lock_reasons from those, not have this module reinvent
 * game/foreground detection. No equivalent Mac "is a human actively using
 * this machine" signal exists yet; that gap is not fixed here.
 */

export const NODE_TYPES = ['mac', 'gamer', 'vps'];

export const DEFAULT_NODE_THRESHOLDS = {
  mac: {
    min_ram_free_gb: 6,
    max_cpu_load_pct: 60,
    max_background_agents: 1,
  },
  gamer: {
    min_ram_free_gb: 12,
    min_gpu_vram_free_pct: 35,
    max_gpu_utilization_pct: 25,
    max_background_agents: 1,
  },
  // The VPS coordinates; it does not execute background agents.
  vps: {
    max_background_agents: 0,
  },
};

/**
 * @param {object} snapshot a ResourceProbe snapshot (see resource-probe.mjs)
 * @param {'mac'|'gamer'|'vps'} nodeType
 * @param {object} [options]
 * @param {object} [options.thresholds] override defaults for this call
 * @param {number} [options.active_background_agents=0] how many background
 *   AgentTasks are already running on this node (caller counts active
 *   `opsly-task-*` Session Manager sessions, or tracks its own state)
 * @param {string[]} [options.active_lock_reasons=[]] human-readable reasons
 *   this node is currently off-limits (gaming mode, active foreground dev
 *   session, etc.) — supplied by the caller, not detected here
 * @returns {{eligible: boolean, reasons: string[], node_type: string, thresholds_used: object}}
 */
export function evaluateIdleWindow(snapshot, nodeType, options = {}) {
  if (!NODE_TYPES.includes(nodeType)) {
    return { eligible: false, reasons: [`unknown node type: ${nodeType}`], node_type: nodeType, thresholds_used: {} };
  }

  const thresholds = { ...DEFAULT_NODE_THRESHOLDS[nodeType], ...(options.thresholds || {}) };
  const reasons = [];

  if ((thresholds.max_background_agents ?? 0) === 0) {
    return {
      eligible: false,
      reasons: ['node type does not run background agents (coordinator only)'],
      node_type: nodeType,
      thresholds_used: thresholds,
    };
  }

  const activeBackgroundAgents = options.active_background_agents ?? 0;
  if (activeBackgroundAgents >= thresholds.max_background_agents) {
    reasons.push(
      `already at max_background_agents (${activeBackgroundAgents}/${thresholds.max_background_agents})`
    );
  }

  for (const lock of options.active_lock_reasons ?? []) {
    reasons.push(`active lock: ${lock}`);
  }

  if (typeof thresholds.min_ram_free_gb === 'number' && snapshot.ram_free_gb < thresholds.min_ram_free_gb) {
    reasons.push(`ram_free_gb ${snapshot.ram_free_gb} < required ${thresholds.min_ram_free_gb}`);
  }

  if (typeof thresholds.max_cpu_load_pct === 'number' && snapshot.cpu_load_pct > thresholds.max_cpu_load_pct) {
    reasons.push(`cpu_load_pct ${snapshot.cpu_load_pct} > allowed ${thresholds.max_cpu_load_pct}`);
  }

  if (typeof thresholds.min_gpu_vram_free_pct === 'number') {
    if (!snapshot.has_gpu) {
      reasons.push('gpu required by node thresholds but none detected');
    } else if (snapshot.gpu_vram_free_pct < thresholds.min_gpu_vram_free_pct) {
      reasons.push(
        `gpu_vram_free_pct ${snapshot.gpu_vram_free_pct} < required ${thresholds.min_gpu_vram_free_pct}`
      );
    }
  }

  if (typeof thresholds.max_gpu_utilization_pct === 'number' && snapshot.has_gpu) {
    if (snapshot.gpu_utilization_pct > thresholds.max_gpu_utilization_pct) {
      reasons.push(
        `gpu_utilization_pct ${snapshot.gpu_utilization_pct} > allowed ${thresholds.max_gpu_utilization_pct}`
      );
    }
  }

  return { eligible: reasons.length === 0, reasons, node_type: nodeType, thresholds_used: thresholds };
}
