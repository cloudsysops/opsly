#!/usr/bin/env node
/**
 * Release automation policy — merge ≠ staging ≠ production.
 *
 * Phases:
 *   MERGE_TO_MAIN      — squash-merge when CI/policy permit (any hour)
 *   DEPLOY_STAGING     — automatic after main (or staging branch) push
 *   PROMOTE_PRODUCTION — America/Bogota 22:00–06:00 exclusive end; fail-closed
 *
 * GitHub Actions cron is UTC. A 01:00 Bogotá schedule (`0 6 * * *`) can land
 * hours late (2026-09-07 ran 06:10 Bogotá). Scheduler delay must skip, not
 * fail, so in-window retries still merge/promote. Do not widen the window.
 */
'use strict';

export const TIME_ZONE = 'America/Bogota';
export const WINDOW_START_HOUR = 22; // inclusive
export const WINDOW_END_HOUR = 6; // exclusive

export const PHASE = Object.freeze({
  MERGE: 'merge',
  STAGING: 'staging',
  PROMOTE: 'promote',
});

export const ACTION = Object.freeze({
  ALLOW: 'allow',
  SKIP: 'skip',
  DENY: 'deny',
});

/** Paths that used to imply "merge = production". Merge no longer deploys prod. */
export const PROD_IMPACT_PREFIXES = [
  'apps/',
  'infra/',
  'supabase/',
  'packages/',
  'lib/',
];

export const PROD_IMPACT_PATH_MATCHERS = [
  /^\.github\/workflows\/deploy/i,
  /^scripts\/.*deploy/i,
  /^scripts\/peskids/i,
  /^scripts\/vps-/i,
  /^scripts\/onboard-/i,
  /^package\.json$/,
  /^package-lock\.json$/,
];

export const SAFE_DAYTIME_MATCHERS = [
  /^docs\//,
  /^\.cursor\//,
  /^\.agents\//,
  /^skills\//,
  /^AGENTS\.md$/,
  /^VISION\.md$/,
  /^ROADMAP\.md$/,
  /^README\.md$/,
  /^SECURITY\.md$/,
  /^CONTRIBUTING\.md$/,
  /^CODE_OF_CONDUCT\.md$/,
  /^\.github\/(PULL_REQUEST_TEMPLATE|ISSUE_TEMPLATE|CODEOWNERS|copilot-instructions)/i,
  /^\.github\/AGENTS\.md$/,
  /\.md$/i,
];

export function bogotaParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value])
  );
  const hour = Number(parts.hour === '24' ? '0' : parts.hour);
  return {
    hour,
    minute: Number(parts.minute),
    stamp: `${parts.year}-${parts.month}-${parts.day} ${String(hour).padStart(2, '0')}:${parts.minute} ${TIME_ZONE}`,
  };
}

export function isNightWindow(date = new Date()) {
  const { hour } = bogotaParts(date);
  return hour >= WINDOW_START_HOUR || hour < WINDOW_END_HOUR;
}

export function truthy(v) {
  if (v == null) return false;
  const s = String(v).trim().toLowerCase();
  return s === '1' || s === 'true' || s === 'yes' || s === 'on';
}

export function normalizePath(p) {
  return String(p || '')
    .trim()
    .replace(/^\.\//, '')
    .replace(/\\/g, '/');
}

export function isSafeDaytimePath(path) {
  const p = normalizePath(path);
  if (!p) return true;
  return SAFE_DAYTIME_MATCHERS.some((re) => re.test(p));
}

export function isProdImpactPath(path) {
  const p = normalizePath(path);
  if (!p) return false;
  if (PROD_IMPACT_PREFIXES.some((prefix) => p.startsWith(prefix))) return true;
  return PROD_IMPACT_PATH_MATCHERS.some((re) => re.test(p));
}

export function classifyPaths(paths) {
  const normalized = [...new Set((paths || []).map(normalizePath).filter(Boolean))];
  const prod = normalized.filter(isProdImpactPath);
  const unsafe = normalized.filter((p) => !isSafeDaytimePath(p));
  const hasImpact = prod.length > 0 || unsafe.length > 0;
  return { normalized, prod, unsafe, hasImpact };
}

/**
 * Skip nvidia-smi / other child probes when the caller already injected probes.
 * Keeps TAP (node:test) from leaving open handles after 5/5 assertions pass.
 */
export function skipExternalGpuProbe(probes = {}) {
  if (probes == null || typeof probes !== 'object') return false;
  return (
    Object.prototype.hasOwnProperty.call(probes, 'gpu') ||
    Object.prototype.hasOwnProperty.call(probes, 'ollama') ||
    Object.prototype.hasOwnProperty.call(probes, 'localAgents') ||
    Object.prototype.hasOwnProperty.call(probes, 'ffmpeg')
  );
}

export function resolveGpuProbe(probes = {}, queryGpu) {
  if (Object.prototype.hasOwnProperty.call(probes, 'gpu')) {
    return probes.gpu && typeof probes.gpu === 'object' ? probes.gpu : {};
  }
  if (skipExternalGpuProbe(probes)) {
    return {};
  }
  if (typeof queryGpu === 'function') {
    return queryGpu() || {};
  }
  return {};
}

/**
 * Image tags for a build job. Main push must not move `:latest` (Watchtower).
 */
export function imageTagsForBuild({ refName, phase } = {}) {
  const ref = String(refName || '');
  const p = String(phase || '');
  if (p === PHASE.PROMOTE || p === 'promote') {
    return { latest: true, staging: false, sha: true, rc: true };
  }
  if (ref === 'staging' || p === PHASE.STAGING) {
    return { latest: false, staging: true, sha: true, rc: false };
  }
  if (ref === 'main') {
    return { latest: false, staging: true, sha: true, rc: true };
  }
  return { latest: false, staging: false, sha: true, rc: false };
}

/**
 * Which SSH deploy jobs may run. A normal main push never touches production.
 */
export function deployJobsForEvent({
  eventName,
  refName,
  phase,
} = {}) {
  const event = String(eventName || '');
  const ref = String(refName || '');
  const p = String(phase || '');
  const staging =
    ref === 'staging' ||
    (ref === 'main' && (event === 'push' || p === PHASE.STAGING || p === 'staging'));
  const production =
    p === PHASE.PROMOTE ||
    p === 'promote' ||
    (event === 'workflow_dispatch' && p === 'promote');
  return {
    deployStaging: Boolean(staging) && !production,
    deployProduction: Boolean(production),
    deployPeskidsProduction: Boolean(production),
    deployPaniniProduction: Boolean(production),
  };
}

function outsideWindowDecision({ eventName, force }) {
  if (force) {
    return {
      action: ACTION.ALLOW,
      exitCode: 0,
      reason: 'force override outside window',
    };
  }
  if (eventName === 'schedule') {
    return {
      action: ACTION.SKIP,
      exitCode: 0,
      reason: 'scheduled run landed outside window — skip, retry next in-window cron',
    };
  }
  return {
    action: ACTION.DENY,
    exitCode: 1,
    reason: 'outside America/Bogota production window — fail closed',
  };
}

/**
 * @param {object} input
 * @param {'merge'|'staging'|'promote'} input.phase
 * @param {string} [input.eventName] push | schedule | workflow_dispatch
 * @param {Date} [input.now]
 * @param {boolean} [input.force]
 * @param {string} [input.rcSha]
 * @param {string} [input.productionSha]
 * @param {string} [input.lastPromotedSha]
 * @param {boolean} [input.approvedPr]
 * @param {boolean} [input.ciGreen]
 */
export function evaluateReleaseAction(input = {}) {
  const phase = String(input.phase || '');
  const eventName = String(input.eventName || 'push');
  const now = input.now instanceof Date ? input.now : new Date();
  const force = Boolean(input.force);
  const inWindow = isNightWindow(now);
  const { stamp } = bogotaParts(now);

  const base = {
    phase,
    eventName,
    inWindow,
    stamp,
    productionTouched: false,
  };

  if (phase === PHASE.MERGE) {
    const ciOk = input.ciGreen !== false;
    const approved = input.approvedPr !== false;
    if (!ciOk) {
      return { ...base, action: ACTION.SKIP, exitCode: 0, reason: 'CI not green — skip merge' };
    }
    if (!approved) {
      return { ...base, action: ACTION.SKIP, exitCode: 0, reason: 'PR not approved — skip merge' };
    }
    return {
      ...base,
      action: ACTION.ALLOW,
      exitCode: 0,
      reason: 'MERGE_TO_MAIN allowed independent of production window',
      productionTouched: false,
    };
  }

  if (phase === PHASE.STAGING) {
    return {
      ...base,
      action: ACTION.ALLOW,
      exitCode: 0,
      reason: 'DEPLOY_STAGING allowed on main/staging push at any hour',
      productionTouched: false,
    };
  }

  if (phase === PHASE.PROMOTE) {
    const rcSha = String(input.rcSha || '').trim();
    const productionSha = String(input.productionSha || '').trim();
    const lastPromotedSha = String(input.lastPromotedSha || '').trim();
    if (rcSha && (rcSha === productionSha || rcSha === lastPromotedSha)) {
      return {
        ...base,
        action: ACTION.SKIP,
        exitCode: 0,
        reason: 'idempotent — production already at ReleaseCandidate SHA',
        productionTouched: false,
      };
    }
    if (!inWindow) {
      return { ...base, ...outsideWindowDecision({ eventName, force }), productionTouched: false };
    }
    return {
      ...base,
      action: ACTION.ALLOW,
      exitCode: 0,
      reason: 'PROMOTE_PRODUCTION allowed inside America/Bogota window',
      productionTouched: true,
    };
  }

  return {
    ...base,
    action: ACTION.DENY,
    exitCode: 1,
    reason: `unknown phase: ${phase}`,
  };
}

export function planProductionRollback({
  shaBefore,
  shaAfter,
  smokeFailed,
  deployFailed,
} = {}) {
  const before = String(shaBefore || '').trim();
  const after = String(shaAfter || '').trim();
  if (!before) {
    return { ok: false, method: 'none', reason: 'missing sha-before' };
  }
  if (before === after) {
    return { ok: true, method: 'noop', reason: 'already at sha-before' };
  }
  return {
    ok: true,
    method: 'revert-pr',
    shaBefore: before,
    shaAfter: after || null,
    labels: ['hotfix-prod'],
    retagLatestFrom: before,
    reason: smokeFailed
      ? 'smoke failed after promote'
      : deployFailed
        ? 'deploy failed after promote'
        : 'verify failed',
  };
}

export function scheduledPromoteCronsUtc() {
  // Bogotá = UTC−5, no DST. Keep last cron inside 22:00–06:00 even with ~5h GHA delay.
  return [
    { utc: '0 3 * * *', bogota: '22:00', note: 'window open' },
    { utc: '0 4 * * *', bogota: '23:00', note: 'survives ~6h delay from 22:00' },
    { utc: '0 6 * * *', bogota: '01:00', note: 'canonical' },
    { utc: '0 9 * * *', bogota: '04:00', note: 'in-window retry' },
    { utc: '0 10 * * *', bogota: '05:00', note: 'last full-hour in-window retry' },
  ];
}

export function scheduledMergeCronsUtc() {
  // Merge is not window-gated; extra crons only recover delayed queue processing.
  return [
    { utc: '0 4 * * *', bogota: '23:00' },
    { utc: '0 6 * * *', bogota: '01:00' },
    { utc: '0 9 * * *', bogota: '04:00' },
    { utc: '0 14 * * *', bogota: '09:00', note: 'daytime catch-up if overnight cron delayed past 06:00' },
    { utc: '0 20 * * *', bogota: '15:00', note: 'afternoon catch-up' },
  ];
}
